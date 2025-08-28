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
    const { user_ids, action, reason, duration_days, admin_id } = await req.json()

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid user_ids array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!action || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validActions = ['ban', 'unban', 'verify', 'unverify', 'suspend', 'delete']
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    // Process each user
    for (const userId of user_ids) {
      try {
        let updateData = {}
        
        switch (action) {
          case 'ban':
            let banExpiry = null
            if (duration_days && duration_days > 0) {
              const expiryDate = new Date()
              expiryDate.setDate(expiryDate.getDate() + duration_days)
              banExpiry = expiryDate.toISOString()
            }
            updateData = {
              status: 'banned',
              is_banned: true,
              ban_expiry: banExpiry,
              updated_at: new Date().toISOString()
            }
            break
            
          case 'unban':
            updateData = {
              status: 'active',
              is_banned: false,
              ban_expiry: null,
              updated_at: new Date().toISOString()
            }
            break
            
          case 'verify':
            updateData = {
              is_verified_business: true,
              updated_at: new Date().toISOString()
            }
            break
            
          case 'unverify':
            updateData = {
              is_verified_business: false,
              updated_at: new Date().toISOString()
            }
            break
            
          case 'suspend':
            if (!duration_days || duration_days <= 0) {
              results.push({ userId, success: false, error: 'Duration required for suspend action' })
              continue
            }
            const suspendExpiry = new Date()
            suspendExpiry.setDate(suspendExpiry.getDate() + duration_days)
            updateData = {
              status: 'suspended',
              suspend_expiry: suspendExpiry.toISOString(),
              updated_at: new Date().toISOString()
            }
            break
            
          case 'delete':
            updateData = {
              status: 'deleted',
              email: `deleted_${userId}@deleted.local`,
              username: `deleted_user_${userId.slice(0, 8)}`,
              updated_at: new Date().toISOString()
            }
            break
        }

        // Update user
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId)

        if (updateError) {
          results.push({ userId, success: false, error: updateError.message })
          continue
        }

        // Log the admin action
        const { error: logError } = await supabase
          .from('admin_actions')
          .insert({
            user_id: userId,
            admin_id: admin_id || elevation.user_id,
            action_type: action,
            reason,
            duration_days,
            created_at: new Date().toISOString()
          })

        if (logError) {
          console.error('Failed to log admin action for user', userId, logError)
        }

        results.push({ userId, success: true })

      } catch (error) {
        results.push({ userId, success: false, error: error.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${successCount} users successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-bulk-user-action:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
