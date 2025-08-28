import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-elevation',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check admin elevation
    const elevationToken = req.headers.get('x-admin-elevation')
    if (!elevationToken) {
      return new Response(
        JSON.stringify({ error: 'Missing admin elevation token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify elevation token
    const { data: elevation, error: elevationError } = await supabase
      .from('admin_elevation_sessions')
      .select('*')
      .eq('token', elevationToken)
      .gt('valid_until', new Date().toISOString())
      .single()

    if (elevationError || !elevation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired elevation token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { user_id, reason, hard_delete, admin_id } = await req.json()

    if (!user_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (hard_delete) {
      // Hard delete: Remove user from auth and all related data
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user_id)
      if (authDeleteError) {
        throw new Error(`Failed to delete auth user: ${authDeleteError.message}`)
      }

      // Delete user record
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user_id)

      if (userDeleteError) {
        throw userDeleteError
      }
    } else {
      // Soft delete: Mark user as deleted
      const { error: updateError } = await supabase
        .from('users')
        .update({
          status: 'deleted',
          email: `deleted_${user_id}@deleted.local`,
          username: `deleted_user_${user_id.slice(0, 8)}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)

      if (updateError) {
        throw updateError
      }
    }

    // Log the admin action
    const { error: logError } = await supabase
      .from('admin_actions')
      .insert({
        user_id,
        admin_id: admin_id || elevation.user_id,
        action_type: 'delete',
        reason,
        metadata: { hard_delete: !!hard_delete },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: hard_delete 
          ? 'User has been permanently deleted' 
          : 'User has been soft deleted and can be restored'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-delete-user:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
