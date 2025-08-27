/*
  # Add Follow Functionality

  1. New Tables
    - `user_follows` - Tracks user-to-user follows
    - `store_follows` - Tracks user-to-store follows

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to manage their own follows

  3. Indexes
    - Add indexes for performance on follow relationships
*/

-- User Follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id)
);

-- Store Follows table
CREATE TABLE IF NOT EXISTS public.store_follows (
  follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, store_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;

-- Policies for user_follows and store_follows
CREATE POLICY "Users can manage their own follows" ON public.user_follows FOR ALL TO authenticated USING (auth.uid() = follower_id);
CREATE POLICY "Follows are visible to authenticated users" ON public.user_follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own store follows" ON public.store_follows FOR ALL TO authenticated USING (auth.uid() = follower_id);
CREATE POLICY "Store follows are visible to authenticated users" ON public.store_follows FOR SELECT TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON public.user_follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_store_follows_store ON public.store_follows(store_id);