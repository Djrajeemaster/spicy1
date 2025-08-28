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
    const { user_id, new_role, reason, admin_id } = await req.json()

    if (!user_id || !new_role || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, new_role, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    const validRoles = ['user', 'verified', 'business', 'moderator', 'admin', 'superadmin']
    if (!validRoles.includes(new_role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Valid roles are: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current user role for logging
    const { data: currentUser, error: getUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user_id)
      .single()

    if (getUserError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: new_role,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)

    if (updateError) {
      throw updateError
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: admin_id || elevation.user_id,
        action_type: 'role_change',
        target_user_id: user_id,
        reason: reason,
        details: { 
          old_role: currentUser.role,
          new_role: new_role,
          elevation_token_used: elevationToken.substring(0, 8) + '...',
          action_timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User role changed from ${currentUser.role} to ${new_role}`,
        old_role: currentUser.role,
        new_role: new_role
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error changing user role:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
