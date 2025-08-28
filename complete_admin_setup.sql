-- Create admin_elevation_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_elevation_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    token text NOT NULL UNIQUE,
    admin_id uuid REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for token lookup
CREATE INDEX IF NOT EXISTS idx_admin_elevation_tokens_token ON admin_elevation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_admin_elevation_tokens_expires_at ON admin_elevation_tokens(expires_at);

-- Add the missing user columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expiry timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspend_expiry timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_users_ban_expiry ON users(ban_expiry) WHERE ban_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspend_expiry ON users(suspend_expiry) WHERE suspend_expiry IS NOT NULL;

-- Show success message
SELECT 'All admin tables and columns created successfully!' as result;
