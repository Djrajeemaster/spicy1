# Users to Create for Each Role

Create these 5 users in your Supabase Auth dashboard:

## 1. General User
- **Email**: `user@example.com`
- **Password**: `password123`
- **Username**: `generaluser`
- **Role**: `user`
- **Reputation**: `1.0`

## 2. Verified Business User
- **Email**: `business@example.com`
- **Password**: `password123`
- **Username**: `verifiedbiz`
- **Role**: `verified_business`
- **Reputation**: `5.0`

## 3. Moderator
- **Email**: `moderator@example.com`
- **Password**: `password123`
- **Username**: `moderator`
- **Role**: `moderator`
- **Reputation**: `5.0`

## 4. Admin
- **Email**: `admin@example.com`
- **Password**: `password123`
- **Username**: `admin`
- **Role**: `admin`
- **Reputation**: `5.0`

## 5. Super Admin
- **Email**: `superadmin@example.com`
- **Password**: `password123`
- **Username**: `superadmin`
- **Role**: `superadmin`
- **Reputation**: `5.0`

## SQL to Insert User Profiles

After creating auth users, run this SQL in Supabase:

```sql
INSERT INTO users (id, username, email, role, reputation, status) VALUES
('auth-user-id-1', 'generaluser', 'user@example.com', 'user', 1.0, 'active'),
('auth-user-id-2', 'verifiedbiz', 'business@example.com', 'verified_business', 5.0, 'active'),
('auth-user-id-3', 'moderator', 'moderator@example.com', 'moderator', 5.0, 'active'),
('auth-user-id-4', 'admin', 'admin@example.com', 'admin', 5.0, 'active'),
('auth-user-id-5', 'superadmin', 'superadmin@example.com', 'superadmin', 5.0, 'active');
```

Replace `auth-user-id-X` with actual user IDs from Supabase Auth.