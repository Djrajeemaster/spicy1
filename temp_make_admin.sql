-- Temporary script to set a user as admin for testing
-- Replace 'YOUR_USER_EMAIL' with the actual email of the user you want to make admin

UPDATE public.users 
SET role = 'superadmin' 
WHERE email = 'YOUR_USER_EMAIL';

-- To check current user roles:
-- SELECT id, email, username, role FROM public.users WHERE role IS NOT NULL;
