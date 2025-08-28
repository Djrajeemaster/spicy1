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
    const { user_id, reason, duration_days, admin_id } = await req.json()

    if (!user_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate suspend expiry
    const suspendExpiry = duration_days 
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Update user status
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        status: 'suspended',
        suspend_expiry: suspendExpiry
      })
      .eq('id', user_id)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to suspend user', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log admin action
    const { error: logError } = await supabase
      .from('admin_actions')
      .insert({
        user_id,
        admin_id,
        action_type: 'suspend',
        reason,
        duration_days,
        metadata: { suspend_expiry: suspendExpiry }
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
        message: duration_days 
          ? `User suspended for ${duration_days} days`
          : 'User suspended indefinitely'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin suspend user error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
