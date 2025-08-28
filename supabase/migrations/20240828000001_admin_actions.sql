-- Migration: Add admin_actions table for logging administrative actions

CREATE TABLE IF NOT EXISTS admin_actions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action_type text NOT NULL CHECK (action_type IN ('ban', 'unban', 'verify', 'unverify', 'suspend', 'unsuspend', 'delete', 'restore', 'reset_password')),
    reason text NOT NULL,
    duration_days integer,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_actions_user_id ON admin_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Add RLS policies
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to view all actions
CREATE POLICY "Admins can view all admin actions" ON admin_actions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'moderator')
        )
    );

-- Policy to allow admins to insert actions
CREATE POLICY "Admins can insert admin actions" ON admin_actions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'moderator')
        )
    );

-- Update users table to include new status fields if they don't exist
DO $$ 
BEGIN
    -- Add is_banned column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_banned') THEN
        ALTER TABLE users ADD COLUMN is_banned boolean DEFAULT false;
    END IF;
    
    -- Add ban_expiry column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ban_expiry') THEN
        ALTER TABLE users ADD COLUMN ban_expiry timestamp with time zone;
    END IF;
    
    -- Add suspend_expiry column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'suspend_expiry') THEN
        ALTER TABLE users ADD COLUMN suspend_expiry timestamp with time zone;
    END IF;
END $$;

-- Add indexes on new user columns
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_users_ban_expiry ON users(ban_expiry) WHERE ban_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspend_expiry ON users(suspend_expiry) WHERE suspend_expiry IS NOT NULL;

-- Create function to automatically clean up expired bans and suspensions
CREATE OR REPLACE FUNCTION cleanup_expired_user_restrictions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clean up expired bans
    UPDATE users 
    SET 
        is_banned = false,
        ban_expiry = NULL,
        status = 'active'
    WHERE 
        is_banned = true 
        AND ban_expiry IS NOT NULL 
        AND ban_expiry < NOW();
    
    -- Clean up expired suspensions
    UPDATE users 
    SET 
        status = 'active',
        suspend_expiry = NULL
    WHERE 
        status = 'suspended' 
        AND suspend_expiry IS NOT NULL 
        AND suspend_expiry < NOW();
END;
$$;

-- Create a trigger to run cleanup periodically (this would ideally be run via a cron job)
-- For now, we'll create the function and it can be called manually or via a scheduled task

COMMENT ON TABLE admin_actions IS 'Log of all administrative actions taken on users';
COMMENT ON FUNCTION cleanup_expired_user_restrictions() IS 'Function to automatically clean up expired user bans and suspensions';
