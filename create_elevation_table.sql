-- Create admin_elevation_sessions table for temporary admin tokens
CREATE TABLE IF NOT EXISTS admin_elevation_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token text NOT NULL UNIQUE,
    valid_until timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_elevation_sessions_token ON admin_elevation_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_elevation_sessions_user_id ON admin_elevation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_elevation_sessions_valid_until ON admin_elevation_sessions(valid_until);

-- Enable RLS
ALTER TABLE admin_elevation_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow admin users to manage their own elevation sessions
CREATE POLICY "Users can manage their own elevation sessions" ON admin_elevation_sessions
    FOR ALL
    USING (user_id = auth.uid());

-- Add a cleanup function to remove expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_elevation_tokens()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM admin_elevation_sessions 
    WHERE valid_until < NOW();
END;
$$;

COMMENT ON TABLE admin_elevation_sessions IS 'Temporary elevation tokens for admin operations';
COMMENT ON FUNCTION cleanup_expired_elevation_tokens() IS 'Function to clean up expired elevation tokens';

-- Test the table creation
SELECT 'admin_elevation_sessions table created successfully!' as result;
