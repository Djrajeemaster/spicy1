-- Add check constraint for valid user roles
-- This ensures that only valid roles can be assigned to users

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
    
    -- Add the correct constraint with proper role values
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('user', 'verified', 'business', 'moderator', 'admin', 'superadmin'));
    
EXCEPTION WHEN others THEN
    -- Constraint might already exist with correct definition
    NULL;
END $$;
