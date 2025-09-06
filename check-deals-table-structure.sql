-- Check the deals table structure specifically
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'deals' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing deal records
SELECT COUNT(*) as total_deals FROM deals;
SELECT status, COUNT(*) as count FROM deals GROUP BY status;

-- Sample existing deals
SELECT id, title, description, price, original_price, store_id, category_id, status, created_at 
FROM deals 
ORDER BY created_at DESC 
LIMIT 5;
