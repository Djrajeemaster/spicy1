-- Update role constraint and fix any existing super_admin references
-- This migration ensures consistency between database and application

DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'users_role_check' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
    
    -- Add the correct constraint with all valid role values
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('user', 'verified', 'business', 'moderator', 'admin', 'superadmin'));
    
    -- Update any existing super_admin roles to superadmin for consistency
    UPDATE users SET role = 'superadmin' WHERE role = 'super_admin';
    
EXCEPTION WHEN others THEN
    -- Log the error but don't fail the migration
    RAISE NOTICE 'Error updating roles: %', SQLERRM;
END $$;
