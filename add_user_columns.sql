-- Run this in Supabase SQL Editor to add missing columns
-- Add missing columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expiry timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspend_expiry timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_users_ban_expiry ON users(ban_expiry) WHERE ban_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspend_expiry ON users(suspend_expiry) WHERE suspend_expiry IS NOT NULL;

-- Show success message
SELECT 'User columns added successfully!' as result;
