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

    const { id, type } = await req.json()

    if (!id || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: id, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updateResult
    let actionDescription = ''

    switch (type) {
      case 'deal':
        updateResult = await supabase
          .from('deals')
          .update({ status: 'live' })
          .eq('id', id)
        actionDescription = `Approved deal ${id}`
        break

      case 'comment':
        updateResult = await supabase
          .from('comments')
          .update({ status: 'approved' })
          .eq('id', id)
        actionDescription = `Approved comment ${id}`
        break

      case 'user_report':
        updateResult = await supabase
          .from('user_reports')
          .update({ 
            status: 'reviewed',
            reviewed_by: elevation.user_id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', id)
        actionDescription = `Approved/dismissed user report ${id}`
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid content type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (updateResult.error) {
      throw updateResult.error
    }

    // Log the admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: elevation.user_id,
        action_type: 'approve',
        reason: actionDescription,
        metadata: {
          content_id: id,
          content_type: type
        },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Content approved successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-approve-content:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
