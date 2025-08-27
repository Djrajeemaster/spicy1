/*
  # Initial SpicyBeats Database Schema

  1. New Tables
    - `users` - User profiles and authentication data
    - `stores` - Store/brand information
    - `categories` - Deal categories
    - `deals` - Main deals table
    - `votes` - User votes on deals
    - `comments` - Deal comments
    - `saved_deals` - User saved deals
    - `alerts` - User alert preferences
    - `reports` - Content reports

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Restrict access based on user roles

  3. Indexes
    - Add performance indexes for common queries
    - Full-text search indexes
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('guest', 'user', 'verified', 'business', 'moderator', 'admin', 'superadmin')),
  is_verified_business boolean DEFAULT false,
  join_date timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended')),
  reputation numeric(3,1) DEFAULT 0.0,
  total_posts integer DEFAULT 0,
  avatar_url text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  description text,
  website_url text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  emoji text NOT NULL,
  is_active boolean DEFAULT true,
  deal_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL,
  original_price numeric(10,2),
  discount_percentage integer,
  category_id uuid NOT NULL REFERENCES categories(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  tags text[] DEFAULT '{}',
  deal_url text,
  coupon_code text,
  images text[] DEFAULT '{}',
  city text NOT NULL,
  state text NOT NULL,
  country text DEFAULT 'India',
  is_online boolean DEFAULT true,
  latitude numeric(9,6),
  longitude numeric(9,6),
  start_date timestamptz,
  expiry_date timestamptz,
  status text DEFAULT 'live' CHECK (status IN ('draft', 'scheduled', 'live', 'expiring', 'expired', 'archived')),
  created_by uuid NOT NULL REFERENCES users(id),
  votes_up integer DEFAULT 0,
  votes_down integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Saved deals table
CREATE TABLE IF NOT EXISTS saved_deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, deal_id)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('keyword', 'category', 'store', 'price_threshold')),
  rules jsonb NOT NULL,
  frequency text DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('deal', 'comment', 'user')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'expired', 'misleading', 'offensive', 'duplicate', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable" ON users
  FOR SELECT TO anon
  USING (true);

-- Stores policies
CREATE POLICY "Stores are viewable by everyone" ON stores
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Only admins can manage stores" ON stores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Only admins can manage categories" ON categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Deals policies
CREATE POLICY "Live deals are viewable by everyone" ON deals
  FOR SELECT TO anon
  USING (status = 'live');

CREATE POLICY "Users can view all deals when authenticated" ON deals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create deals" ON deals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('user', 'verified', 'business', 'moderator', 'admin', 'superadmin')
      AND users.status = 'active'
    )
  );

CREATE POLICY "Users can update own deals" ON deals
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Moderators can manage all deals" ON deals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- Votes policies
CREATE POLICY "Users can manage own votes" ON votes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.status = 'active'
    )
  );

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Saved deals policies
CREATE POLICY "Users can manage own saved deals" ON saved_deals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can manage own alerts" ON alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can manage all reports" ON reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category_id);
CREATE INDEX IF NOT EXISTS idx_deals_store ON deals(store_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_by ON deals(created_by);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_votes ON deals(votes_up DESC, votes_down);
CREATE INDEX IF NOT EXISTS idx_deals_location ON deals(city, state);
CREATE INDEX IF NOT EXISTS idx_deals_expiry ON deals(expiry_date);
CREATE INDEX IF NOT EXISTS idx_deals_location_coords ON deals(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_votes_deal ON votes(deal_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_deal ON comments(deal_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_saved_deals_user ON saved_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_deal ON saved_deals(deal_id);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- Full-text search index for deals
CREATE INDEX IF NOT EXISTS idx_deals_search ON deals USING gin(to_tsvector('english', title || ' ' || description));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();