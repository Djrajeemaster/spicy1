-- Create saved_deals table for user's saved deals
CREATE TABLE IF NOT EXISTS saved_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, deal_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_deals_user_id ON saved_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_deal_id ON saved_deals(deal_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_created_at ON saved_deals(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own saved deals" ON saved_deals
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert their own saved deals" ON saved_deals
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete their own saved deals" ON saved_deals
  FOR DELETE USING (auth.uid()::uuid = user_id);
