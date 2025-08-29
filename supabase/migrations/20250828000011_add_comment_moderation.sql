-- Add moderation columns to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_is_flagged ON comments(is_flagged);
CREATE INDEX IF NOT EXISTS idx_comments_flag_count ON comments(flag_count);
CREATE INDEX IF NOT EXISTS idx_comments_admin_reviewed ON comments(admin_reviewed);

-- Create function to automatically flag comments with multiple reports
CREATE OR REPLACE FUNCTION auto_flag_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- If flag_count reaches 3 or more, automatically mark as flagged
  IF NEW.flag_count >= 3 AND NOT NEW.is_flagged THEN
    NEW.is_flagged = TRUE;
    NEW.flagged_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-flagging
CREATE TRIGGER trigger_auto_flag_comment
  BEFORE UPDATE OF flag_count ON comments
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_comment();
