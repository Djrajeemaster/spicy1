import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Create the admin_elevation_sessions table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_elevation_sessions (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          token text NOT NULL UNIQUE,
          valid_until timestamp with time zone NOT NULL,
          created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_admin_elevation_sessions_token ON admin_elevation_sessions(token);
        CREATE INDEX IF NOT EXISTS idx_admin_elevation_sessions_user_id ON admin_elevation_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_admin_elevation_sessions_valid_until ON admin_elevation_sessions(valid_until);

        ALTER TABLE admin_elevation_sessions ENABLE ROW LEVEL SECURITY;

        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_elevation_sessions' AND policyname = 'Users can manage their own elevation sessions') THEN
            CREATE POLICY "Users can manage their own elevation sessions" ON admin_elevation_sessions
              FOR ALL
              USING (user_id = auth.uid());
          END IF;
        END $$;
      `
    })

    if (error) {
      console.error('SQL Error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create table', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'admin_elevation_sessions table created successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Function error:', err)
    return new Response(
      JSON.stringify({ error: 'Function error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
