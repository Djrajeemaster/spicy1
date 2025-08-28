import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user statistics
    const [dealsResult, commentsResult, votesGivenResult, votesReceivedResult] = await Promise.all([
      // Total deals created by user
      supabase
        .from('deals')
        .select('id', { count: 'exact' })
        .eq('created_by', userId),
      
      // Total comments by user
      supabase
        .from('comments')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      
      // Total votes given by user
      supabase
        .from('votes')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      
      // Total upvotes received on user's deals
      supabase
        .from('deals')
        .select('votes_up')
        .eq('created_by', userId)
    ])

    const totalDeals = dealsResult.count || 0
    const totalComments = commentsResult.count || 0
    const totalVotesGiven = votesGivenResult.count || 0
    const totalVotesReceived = dealsResult.data?.reduce((sum, deal) => sum + (deal.votes_up || 0), 0) || 0

    // Calculate account age
    const accountAgeMs = new Date().getTime() - new Date(user.created_at).getTime()
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24))

    // Check ban/suspend status
    const now = new Date().toISOString()
    const isBanned = user.is_banned || user.status === 'banned'
    const isSuspended = user.status === 'suspended'
    const banExpired = user.ban_expiry && user.ban_expiry < now
    const suspendExpired = user.suspend_expiry && user.suspend_expiry < now

    const stats = {
      user,
      stats: {
        total_deals: totalDeals,
        total_comments: totalComments,
        total_votes_given: totalVotesGiven,
        total_votes_received: totalVotesReceived,
        account_age_days: accountAgeDays,
        last_activity: user.updated_at || user.created_at,
        is_banned: isBanned && !banExpired,
        is_suspended: isSuspended && !suspendExpired,
        ban_expiry: user.ban_expiry,
        suspend_expiry: user.suspend_expiry
      }
    }

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-user-stats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
