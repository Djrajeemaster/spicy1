-- Check for existing constraints on users table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass
AND contype = 'c';  -- check constraints

-- Also check table structure
\d users;
