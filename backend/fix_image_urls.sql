-- Run this in the Supabase SQL Editor to fix broken image URLs
-- The current image_url values use https://example.com/... which don't serve real images.
-- This replaces them with https://picsum.photos/seed/... which serve actual photos.

-- Fix all existing product image URLs
UPDATE products SET image_url = 'https://picsum.photos/seed/kurta1/400/500' WHERE name = 'Cotton Kurta';
UPDATE products SET image_url = 'https://picsum.photos/seed/suit1/400/500' WHERE name = 'Embroidered Silk Suit';
UPDATE products SET image_url = 'https://picsum.photos/seed/tshirt1/400/500' WHERE name = 'Basic Crew Neck T-Shirt';
UPDATE products SET image_url = 'https://picsum.photos/seed/tshirt2/400/500' WHERE name = 'Graphic Print Tee';
UPDATE products SET image_url = 'https://picsum.photos/seed/jeans1/400/500' WHERE name = 'Slim Fit Denim';
UPDATE products SET image_url = 'https://picsum.photos/seed/jeans2/400/500' WHERE name = 'Relaxed Mom Jeans';
UPDATE products SET image_url = 'https://picsum.photos/seed/dress1/400/500' WHERE name = 'Floral Maxi Dress';
UPDATE products SET image_url = 'https://picsum.photos/seed/dress2/400/500' WHERE name = 'Little Black Dress';
UPDATE products SET image_url = 'https://picsum.photos/seed/shoes1/400/500' WHERE name = 'White Sneakers';
UPDATE products SET image_url = 'https://picsum.photos/seed/shoes2/400/500' WHERE name = 'Running Shoes';
UPDATE products SET image_url = 'https://picsum.photos/seed/jacket1/400/500' WHERE name = 'Leather Biker Jacket';
UPDATE products SET image_url = 'https://picsum.photos/seed/jacket2/400/500' WHERE name = 'Denim Jacket';
UPDATE products SET image_url = 'https://picsum.photos/seed/kurta2/400/500' WHERE name = 'Straight Kurta';
UPDATE products SET image_url = 'https://picsum.photos/seed/kurta3/400/500' WHERE name = 'Anarkali Kurta';
UPDATE products SET image_url = 'https://picsum.photos/seed/polo1/400/500' WHERE name = 'Polo T-Shirt';
UPDATE products SET image_url = 'https://picsum.photos/seed/tshirt4/400/500' WHERE name = 'Oversized Tee';
UPDATE products SET image_url = 'https://picsum.photos/seed/jeans3/400/500' WHERE name = 'Bootcut Jeans';
UPDATE products SET image_url = 'https://picsum.photos/seed/jeans4/400/500' WHERE name = 'Skinny Fit Jeans';
UPDATE products SET image_url = 'https://picsum.photos/seed/dress3/400/500' WHERE name = 'Slip Dress';
UPDATE products SET image_url = 'https://picsum.photos/seed/dress4/400/500' WHERE name = 'Wrap Dress';
UPDATE products SET image_url = 'https://picsum.photos/seed/shoes3/400/500' WHERE name = 'Formal Oxfords';
UPDATE products SET image_url = 'https://picsum.photos/seed/shoes4/400/500' WHERE name = 'Chunky Boots';
UPDATE products SET image_url = 'https://picsum.photos/seed/jacket3/400/500' WHERE name = 'Bomber Jacket';
UPDATE products SET image_url = 'https://picsum.photos/seed/jacket4/400/500' WHERE name = 'Puffer Jacket';

-- Also insert the trigger product for the covert safety feature if it doesn't exist.
-- Uses the first category (kurtas-suits) as default.
INSERT INTO products (name, brand, category_id, price, mrp, discount_percent, image_url, sizes, description)
SELECT 'Classic Cotton T-Shirt', 'Roadster', '11111111-1111-1111-1111-111111111111', 499, 999, 50,
       'https://picsum.photos/seed/trigger1/400/500', ARRAY['S', 'M', 'L', 'XL'],
       'A comfortable cotton t-shirt for daily wear.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Classic Cotton T-Shirt');
