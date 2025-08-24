/*
  # Create system settings table for application configuration

  1. New Tables
    - `system_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique, not null)
      - `value` (jsonb, not null)
      - `description` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `system_settings` table
    - Add policy for admin-only access

  3. Default Settings
    - Insert default system settings
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('autoApproveVerifiedUsers', 'true', 'Automatically approve deals from verified users'),
  ('requireModeration', 'true', 'Require moderation for all new deals'),
  ('allowGuestPosting', 'false', 'Allow guests to post deals without an account'),
  ('maxDailyPosts', '5', 'Maximum number of deals a user can post per day'),
  ('minReputationToPost', '2.0', 'Minimum reputation score required to post deals')
ON CONFLICT (key) DO NOTHING;