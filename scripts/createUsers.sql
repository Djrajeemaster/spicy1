-- Create users for each role in local PostgreSQL
INSERT INTO users (id, username, email, role, reputation, status, created_at) VALUES
('user-001', 'generaluser', 'user@example.com', 'user', 1.0, 'active', NOW()),
('user-002', 'verifiedbiz', 'business@example.com', 'verified_business', 5.0, 'active', NOW()),
('user-003', 'moderator', 'moderator@example.com', 'moderator', 5.0, 'active', NOW()),
('user-004', 'admin', 'admin@example.com', 'admin', 5.0, 'active', NOW()),
('user-005', 'superadmin', 'superadmin@example.com', 'superadmin', 5.0, 'active', NOW());