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
    const { data: tokenData, error: tokenError } = await supabase
      .from('admin_elevation_sessions')
      .select('*')
      .eq('token', elevationToken)
      .gt('valid_until', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired elevation token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { user_id, reason, admin_id } = await req.json()

    if (!user_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user role (remove verification by changing role from verified to user)
    const { data: userData, error: getUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user_id)
      .single()

    if (getUserError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Change verified to user, keep other roles unchanged
    const newRole = userData.role === 'verified' ? 'user' : userData.role
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: newRole,
        // You could also add an is_verified field if your schema supports it
        // is_verified: false
      })
      .eq('id', user_id)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to unverify user', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log admin action
    const { error: logError } = await supabase
      .from('admin_actions')
      .insert({
        user_id,
        admin_id,
        action_type: 'unverify',
        reason,
        metadata: { previous_role: userData.role, new_role: newRole }
      })

    if (logError) {
      console.error('Failed to log admin action:', logError)
    }

    // Delete used elevation token (single-use)
    await supabase
      .from('admin_elevation_sessions')
      .delete()
      .eq('id', tokenData.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User verification removed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin unverify user error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
