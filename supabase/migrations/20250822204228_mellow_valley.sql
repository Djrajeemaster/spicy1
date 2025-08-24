/*
  # Seed Initial Data for SpicyBeats

  1. Categories
    - Electronics, Food & Dining, Clothing, etc.

  2. Stores
    - Popular Indian stores and brands

  3. Sample Deals
    - Demo deals for testing
*/

-- Insert categories
INSERT INTO categories (name, slug, emoji, is_active) VALUES
  ('Electronics', 'electronics', '📱', true),
  ('Food & Dining', 'food-dining', '🍕', true),
  ('Clothing', 'clothing', '👕', true),
  ('Home & Garden', 'home-garden', '🏠', true),
  ('Automotive', 'automotive', '🚗', true),
  ('Services', 'services', '🔧', true),
  ('Beauty & Health', 'beauty-health', '💄', true),
  ('Travel', 'travel', '✈️', true),
  ('Books & Education', 'books-education', '📚', true),
  ('Sports & Fitness', 'sports-fitness', '⚽', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert stores
INSERT INTO stores (name, slug, logo_url, description, website_url, verified) VALUES
  ('Amazon India', 'amazon-india', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'India''s largest online marketplace', 'https://amazon.in', true),
  ('Flipkart', 'flipkart', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Leading e-commerce platform in India', 'https://flipkart.com', true),
  ('Myntra', 'myntra', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Fashion and lifestyle e-commerce', 'https://myntra.com', true),
  ('Zomato', 'zomato', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Food delivery and restaurant discovery', 'https://zomato.com', true),
  ('Swiggy', 'swiggy', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Food delivery platform', 'https://swiggy.com', true),
  ('BigBasket', 'bigbasket', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Online grocery shopping', 'https://bigbasket.com', true),
  ('Nykaa', 'nykaa', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Beauty and cosmetics e-commerce', 'https://nykaa.com', true),
  ('Croma', 'croma', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Electronics retail chain', 'https://croma.com', true),
  ('BookMyShow', 'bookmyshow', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Movie and event ticketing', 'https://bookmyshow.com', true),
  ('MakeMyTrip', 'makemytrip', 'https://images.pexels.com/photos/6214479/pexels-photo-6214479.jpeg?auto=compress&cs=tinysrgb&w=100', 'Travel booking platform', 'https://makemytrip.com', true)
ON CONFLICT (slug) DO NOTHING;