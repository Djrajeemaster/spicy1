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

    const { title, content, type, target_audience, send_push } = await req.json()

    if (!title || !content || !type || !target_audience) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create announcement
    const { data: announcement, error: insertError } = await supabase
      .from('admin_announcements')
      .insert({
        admin_id: elevation.user_id,
        title,
        content,
        type,
        target_audience,
        send_push,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // If push notification requested, send to appropriate users
    if (send_push) {
      let userQuery = supabase.from('users').select('id')
      
      switch (target_audience) {
        case 'verified':
          userQuery = userQuery.eq('role', 'verified')
          break
        case 'business':
          userQuery = userQuery.eq('role', 'business')
          break
        case 'moderators':
          userQuery = userQuery.in('role', ['moderator', 'admin', 'superadmin'])
          break
        case 'all':
        default:
          // No additional filter for all users
          break
      }

      const { data: targetUsers } = await userQuery

      if (targetUsers && targetUsers.length > 0) {
        // Send push notifications (implement your push notification logic here)
        console.log(`Sending push notifications to ${targetUsers.length} users`)
      }
    }

    // Log the admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: elevation.user_id,
        action_type: 'send_announcement',
        reason: `Sent announcement: ${title}`,
        metadata: {
          announcement_id: announcement.id,
          target_audience,
          send_push
        },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        announcement_id: announcement.id,
        message: 'Announcement sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-send-announcement:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
