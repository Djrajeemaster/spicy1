/*
  # Create RPC function to increment comment count

  1. Functions
    - `increment_comment_count` - Safely increments the comment_count for a deal

  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION increment_comment_count(deal_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE deals 
  SET comment_count = COALESCE(comment_count, 0) + 1,
      updated_at = now()
  WHERE id = deal_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_comment_count(uuid) TO authenticated;