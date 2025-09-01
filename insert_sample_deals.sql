-- First, insert basic categories and stores if they don't exist
INSERT INTO categories (id, name, slug, emoji, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Food & Beverages', 'food-beverages', '🍕', true),
('550e8400-e29b-41d4-a716-446655440002', 'Electronics', 'electronics', '📱', true),
('550e8400-e29b-41d4-a716-446655440003', 'Fashion', 'fashion', '👕', true),
('550e8400-e29b-41d4-a716-446655440004', 'Home & Garden', 'home-garden', '🏠', true),
('550e8400-e29b-41d4-a716-446655440005', 'Health & Beauty', 'health-beauty', '💄', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, slug, verified) VALUES 
('660e8400-e29b-41d4-a716-446655440001', 'Amazon', 'amazon', true),
('660e8400-e29b-41d4-a716-446655440002', 'Flipkart', 'flipkart', true),
('660e8400-e29b-41d4-a716-446655440003', 'Local Store', 'local-store', false),
('660e8400-e29b-41d4-a716-446655440004', 'Myntra', 'myntra', true),
('660e8400-e29b-41d4-a716-446655440005', 'BigBasket', 'bigbasket', true)
ON CONFLICT (id) DO NOTHING;

-- Now insert the deals with proper category_id and store_id references
INSERT INTO deals (
    id, title, description, price, original_price, discount_percentage,
    category_id, store_id, city, state, country, status, created_by
) VALUES 
(gen_random_uuid(), '50% Off Premium Coffee Beans', 'Get premium arabica coffee beans at half price. Limited time offer!', 14.99, 29.99, 50, '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', 'Mumbai', 'Maharashtra', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Smartphone Deal - 30% Off', 'Latest Android smartphone with amazing features at discounted price', 349.99, 499.99, 30, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Delhi', 'Delhi', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Designer T-Shirt Sale', 'Premium cotton t-shirts from top brands. Buy 2 get 1 free!', 19.99, 39.99, 50, '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', 'Bangalore', 'Karnataka', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Home Decor Items - 40% Off', 'Beautiful home decoration pieces to enhance your living space', 24.99, 41.66, 40, '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440003', 'Chennai', 'Tamil Nadu', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Skincare Bundle Deal', 'Complete skincare routine products at amazing discount', 89.99, 149.99, 40, '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003', 'Pune', 'Maharashtra', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Wireless Headphones - 25% Off', 'Premium noise-cancelling wireless headphones', 74.99, 99.99, 25, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'Hyderabad', 'Telangana', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Organic Vegetables Box', 'Fresh organic vegetables delivered to your doorstep', 12.99, 19.99, 35, '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', 'Kolkata', 'West Bengal', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Gaming Laptop Special', 'High-performance gaming laptop with RTX graphics', 899.99, 1199.99, 25, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Ahmedabad', 'Gujarat', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Summer Fashion Collection', 'Trendy summer outfits for men and women', 29.99, 59.99, 50, '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', 'Jaipur', 'Rajasthan', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Kitchen Appliances Sale', 'Essential kitchen appliances at unbeatable prices', 199.99, 299.99, 33, '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', 'Surat', 'Gujarat', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Fitness Equipment Deal', 'Home gym equipment to stay fit and healthy', 149.99, 249.99, 40, '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003', 'Lucknow', 'Uttar Pradesh', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Book Collection Sale', 'Best-selling books across all genres at discounted rates', 9.99, 19.99, 50, '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440003', 'Kanpur', 'Uttar Pradesh', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Smart Watch Offer', 'Feature-rich smartwatch with health monitoring', 129.99, 199.99, 35, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'Nagpur', 'Maharashtra', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Gourmet Food Hamper', 'Delicious gourmet food items perfect for gifting', 49.99, 79.99, 37, '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', 'Indore', 'Madhya Pradesh', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Laptop Accessories Bundle', 'Complete laptop accessories including mouse, keyboard, and bag', 39.99, 69.99, 43, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Thane', 'Maharashtra', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Ethnic Wear Collection', 'Traditional Indian clothing for festivals and occasions', 79.99, 159.99, 50, '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', 'Bhopal', 'Madhya Pradesh', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Garden Tools Set', 'Professional gardening tools for your home garden', 34.99, 49.99, 30, '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440003', 'Visakhapatnam', 'Andhra Pradesh', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Premium Makeup Kit', 'Professional makeup kit with all essential products', 119.99, 199.99, 40, '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440004', 'Vadodara', 'Gujarat', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Tablet Computer Deal', '10-inch tablet perfect for work and entertainment', 199.99, 299.99, 33, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'Rajkot', 'Gujarat', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790'),
(gen_random_uuid(), 'Artisan Coffee Subscription', 'Monthly subscription of premium artisan coffee beans', 24.99, 39.99, 37, '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', 'Agra', 'Uttar Pradesh', 'India', 'live', '0eaa56d5-8d98-42af-9148-6183e6280790');