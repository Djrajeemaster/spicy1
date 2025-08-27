/*
  # Schema Enhancements & Fixes

  This migration adds missing columns and tables required by the application code.

  1. Add `is_pinned` to `deals`
    - The `EnhancedDealCard` component uses this to display promoted deals.
    - An index is added for performance.

  2. Create `push_tokens` table
    - The `usePushNotifications` hook requires this table to store user device tokens for sending notifications.
    - RLS policies and indexes are included.
*/

-- 1. Add `is_pinned` column to deals table
-- This command is safe to re-run as it checks for the column's existence first.
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Add an index for pinned deals for performance
CREATE INDEX IF NOT EXISTS idx_deals_pinned ON deals(is_pinned, created_at DESC) WHERE is_pinned = true;


-- 2. Create `push_tokens` table for push notifications
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id text,
  app_version text,
  disabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

-- Enable RLS and add policies
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid errors on re-run
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.push_tokens;

CREATE POLICY "Users can manage their own push tokens"
  ON public.push_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);