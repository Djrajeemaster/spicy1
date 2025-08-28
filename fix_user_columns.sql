-- Simple script to add missing user columns
-- Run this in Supabase SQL Editor if columns don't exist

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add is_banned column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_banned') THEN
        ALTER TABLE users ADD COLUMN is_banned boolean DEFAULT false;
        RAISE NOTICE 'Added is_banned column';
    ELSE
        RAISE NOTICE 'is_banned column already exists';
    END IF;
    
    -- Add ban_expiry column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ban_expiry') THEN
        ALTER TABLE users ADD COLUMN ban_expiry timestamp with time zone;
        RAISE NOTICE 'Added ban_expiry column';
    ELSE
        RAISE NOTICE 'ban_expiry column already exists';
    END IF;
    
    -- Add suspend_expiry column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'suspend_expiry') THEN
        ALTER TABLE users ADD COLUMN suspend_expiry timestamp with time zone;
        RAISE NOTICE 'Added suspend_expiry column';
    ELSE
        RAISE NOTICE 'suspend_expiry column already exists';
    END IF;
END $$;

-- Add indexes on new user columns (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_users_ban_expiry ON users(ban_expiry) WHERE ban_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_suspend_expiry ON users(suspend_expiry) WHERE suspend_expiry IS NOT NULL;
