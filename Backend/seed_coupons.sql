-- Seed Coupons Database
-- Connect to kashif_coupons database

-- Insert Companies
INSERT INTO companies (name, description, created_at) VALUES
('Starbucks', 'Coffee chain', NOW()),
('McDonalds', 'Fast food restaurant', NOW()),
('Jarir Bookstore', 'Books and electronics', NOW()),
('Hyper Panda', 'Supermarket', NOW()),
('Saudi Airlines', 'National airline', NOW())
ON CONFLICT DO NOTHING;

-- Insert Categories
INSERT INTO coupon_categories (name, icon, created_at) VALUES
('Food & Beverage', '🍔', NOW()),
('Shopping', '🛍️', NOW()),
('Entertainment', '🎭', NOW()),
('Travel', '✈️', NOW())
ON CONFLICT DO NOTHING;

-- Insert Sample Coupons
INSERT INTO coupons (
    company_id, category_id, title, description, code, 
    discount_percentage, points_required, max_redemptions, 
    current_redemptions, expires_at, created_at
) VALUES
(1, 1, '20% Off Any Beverage', 'Get 20% off your next beverage purchase', 'STAR2024', 20, 100, 100, 15, NOW() + INTERVAL '60 days', NOW()),
(1, 1, 'Free Pastry with Coffee', 'Buy any coffee get a pastry free', 'STARFREE', 0, 150, 50, 8, NOW() + INTERVAL '30 days', NOW()),
(2, 1, 'Buy One Get One Free', 'BOGO on any burger', 'MCBOGO24', 50, 200, 100, 25, NOW() + INTERVAL '45 days', NOW()),
(2, 1, 'Family Meal Deal', '30% off family meals', 'MCFAM30', 30, 250, 75, 12, NOW() + INTERVAL '90 days', NOW()),
(3, 2, 'SR 50 Off Books', 'Get SR 50 off on books purchase over SR 200', 'BOOK50', 0, 300, 50, 5, NOW() + INTERVAL '120 days', NOW()),
(3, 2, '15% Off Electronics', 'Save 15% on all electronics', 'TECH15', 15, 400, 40, 8, NOW() + INTERVAL '60 days', NOW()),
(4, 2, '25% Off Grocery', '25% discount on grocery shopping', 'GROC25', 25, 150, 200, 45, NOW() + INTERVAL '30 days', NOW()),
(4, 2, 'Free Delivery', 'Free delivery on orders over SR 150', 'DELIVERY', 0, 75, 150, 62, NOW() + INTERVAL '90 days', NOW()),
(5, 4, '10% Off Domestic Flights', 'Save 10% on domestic flights', 'FLY10', 10, 500, 50, 18, NOW() + INTERVAL '180 days', NOW()),
(5, 4, 'Free Extra Baggage', 'Free 1 extra baggage allowance', 'BAGFREE', 0, 350, 30, 9, NOW() + INTERVAL '120 days', NOW()),
(1, 1, 'Double Stars Day', 'Earn double reward stars', 'DOUBLE', 0, 50, 200, 87, NOW() + INTERVAL '15 days', NOW()),
(2, 1, 'Kids Meal SR 5', 'Kids meal for only SR 5', 'KIDS5', 0, 100, 100, 34, NOW() + INTERVAL '45 days', NOW()),
(3, 2, '20% Off Stationery', 'Save on school supplies', 'STAT20', 20, 120, 80, 21, NOW() + INTERVAL '60 days', NOW()),
(4, 2, 'SR 100 Off Shopping', 'SR 100 off on purchases over SR 500', 'SHOP100', 0, 450, 60, 11, NOW() + INTERVAL '75 days', NOW()),
(5, 4, 'Business Class Upgrade', 'Upgrade to business class', 'BUSINESS', 0, 800, 20, 3, NOW() + INTERVAL '150 days', NOW());
