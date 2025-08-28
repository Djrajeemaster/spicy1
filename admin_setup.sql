-- Add missing admin columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expiry timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspend_expiry timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_users_ban_expiry ON users(ban_expiry) WHERE ban_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspend_expiry ON users(suspend_expiry) WHERE suspend_expiry IS NOT NULL;

-- Create admin_actions table for logging admin actions
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

-- Add indexes for admin_actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_user_id ON admin_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_actions
CREATE POLICY IF NOT EXISTS "Admins can view all admin actions" ON admin_actions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'moderator')
        )
    );

CREATE POLICY IF NOT EXISTS "Admins can insert admin actions" ON admin_actions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'moderator')
        )
    );

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role = 'superadmin'
    );
END;
$$;

-- Function to clean up expired restrictions
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
