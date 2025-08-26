-- Enhanced sample deals with coupon codes and deal URLs
UPDATE deals SET 
  deal_url = 'https://techmart.com/iphone-15-pro',
  coupon_code = 'SAVE200'
WHERE title = 'iPhone 15 Pro Max';

UPDATE deals SET 
  coupon_code = 'WINTER50'
WHERE title = 'Designer Jacket';

UPDATE deals SET 
  deal_url = 'https://pizzapalace.com/combo-deal',
  coupon_code = 'COMBO20'
WHERE title = 'Pizza Combo Deal';

UPDATE deals SET 
  deal_url = 'https://techmart.com/samsung-galaxy'
WHERE title = 'Samsung Galaxy S24';

UPDATE deals SET 
  coupon_code = 'LAPTOP100'
WHERE title = 'MacBook Air M3';

UPDATE deals SET 
  deal_url = 'https://sportzone.com/basketball'
WHERE title = 'Basketball';

UPDATE deals SET 
  coupon_code = 'YOGA15'
WHERE title = 'Yoga Mat';

-- Add some sample view counts and votes for testing
UPDATE deals SET 
  view_count = 150,
  votes_up = 25,
  votes_down = 2
WHERE title = 'iPhone 15 Pro Max';

UPDATE deals SET 
  view_count = 89,
  votes_up = 12,
  votes_down = 1
WHERE title = 'Designer Jacket';

UPDATE deals SET 
  view_count = 234,
  votes_up = 45,
  votes_down = 3
WHERE title = 'Pizza Combo Deal';