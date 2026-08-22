-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_name TEXT
);

-- products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  category_id UUID REFERENCES categories(id),
  price NUMERIC NOT NULL,
  mrp NUMERIC,
  discount_percent INT,
  image_url TEXT,
  sizes TEXT[],
  rating NUMERIC DEFAULT 4.0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- profiles
-- We map this directly from user_id for simplicity, using UUID
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  security_pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- cart_items
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INT DEFAULT 1,
  size TEXT,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- wishlist
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  is_valid BOOLEAN DEFAULT TRUE
);

-- Note: Since we are using service role / direct connection via FastAPI, 
-- RLS doesn't block us, but we enable it for good measure.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public products read" ON products FOR SELECT USING (true);
CREATE POLICY "Public categories read" ON categories FOR SELECT USING (true);

-- Wishlist: users can only access their own rows
CREATE POLICY "Wishlist user select" ON wishlist FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Wishlist user insert" ON wishlist FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Wishlist user delete" ON wishlist FOR DELETE USING (user_id = auth.uid());

-- Cart: users can only access their own rows
CREATE POLICY "Cart user select" ON cart_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Cart user insert" ON cart_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Cart user delete" ON cart_items FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Cart user update" ON cart_items FOR UPDATE USING (user_id = auth.uid());

-- Seed Categories
INSERT INTO categories (id, name, slug, icon_name) VALUES
('11111111-1111-1111-1111-111111111111', 'Men', 'men', 'user'),
('22222222-2222-2222-2222-222222222222', 'Women', 'women', 'user'),
('33333333-3333-3333-3333-333333333333', 'Kids', 'kids', 'smile'),
('44444444-4444-4444-4444-444444444444', 'Home', 'home', 'home'),
('55555555-5555-5555-5555-555555555555', 'Beauty', 'beauty', 'star'),
('66666666-6666-6666-6666-666666666666', 'Footwear', 'footwear', 'shopping-bag')
ON CONFLICT DO NOTHING;

-- Seed Products
INSERT INTO products (name, brand, category_id, price, mrp, discount_percent, image_url, sizes, description) VALUES
('Classic Cotton T-Shirt', 'Roadster', '11111111-1111-1111-1111-111111111111', 499, 999, 50, 'https://picsum.photos/seed/p1/400/500', ARRAY['S', 'M', 'L', 'XL'], 'A comfortable cotton t-shirt for daily wear.'),
('Denim Jacket', 'Levi''s', '11111111-1111-1111-1111-111111111111', 2499, 4999, 50, 'https://picsum.photos/seed/p2/400/500', ARRAY['M', 'L', 'XL'], 'Classic blue denim jacket.'),
('Floral Summer Dress', 'H&M', '22222222-2222-2222-2222-222222222222', 1299, 1999, 35, 'https://picsum.photos/seed/p3/400/500', ARRAY['XS', 'S', 'M', 'L'], 'Light and breezy floral dress perfect for summer.'),
('Women''s Running Shoes', 'Nike', '66666666-6666-6666-6666-666666666666', 3499, 4999, 30, 'https://picsum.photos/seed/p4/400/500', ARRAY['6', '7', '8'], 'Lightweight and comfortable running shoes.'),
('Kids Graphic T-Shirt', 'GAP', '33333333-3333-3333-3333-333333333333', 399, 799, 50, 'https://picsum.photos/seed/p5/400/500', ARRAY['4Y', '6Y', '8Y'], 'Fun graphic tee for kids.'),
('Soft Throw Blanket', 'IKEA', '44444444-4444-4444-4444-444444444444', 899, 1499, 40, 'https://picsum.photos/seed/p6/400/500', ARRAY['One Size'], 'Cozy throw blanket for your living room.'),
('Hydrating Face Serum', 'L''Oreal', '55555555-5555-5555-5555-555555555555', 699, 999, 30, 'https://picsum.photos/seed/p7/400/500', ARRAY['30ml'], 'Deeply hydrating face serum with Hyaluronic Acid.'),
('Men''s Formal Trousers', 'Van Heusen', '11111111-1111-1111-1111-111111111111', 1599, 2499, 36, 'https://picsum.photos/seed/p8/400/500', ARRAY['30', '32', '34', '36'], 'Slim fit formal trousers.'),
('Women''s Silk Saree', 'FabIndia', '22222222-2222-2222-2222-222222222222', 4599, 6599, 30, 'https://picsum.photos/seed/p9/400/500', ARRAY['Free Size'], 'Elegant traditional silk saree.'),
('Men''s Sneakers', 'Puma', '66666666-6666-6666-6666-666666666666', 2999, 4499, 33, 'https://picsum.photos/seed/p10/400/500', ARRAY['8', '9', '10', '11'], 'Stylish casual sneakers.'),
('Kids Denim Overalls', 'Mothercare', '33333333-3333-3333-3333-333333333333', 999, 1499, 33, 'https://picsum.photos/seed/p11/400/500', ARRAY['2Y', '3Y', '4Y'], 'Cute denim overalls for toddlers.'),
('Ceramic Coffee Mug Set', 'Chumbak', '44444444-4444-4444-4444-444444444444', 599, 899, 33, 'https://picsum.photos/seed/p12/400/500', ARRAY['Set of 2'], 'Vibrant ceramic coffee mugs.'),
('Matte Lipstick', 'MAC', '55555555-5555-5555-5555-555555555555', 1299, 1599, 18, 'https://picsum.photos/seed/p13/400/500', ARRAY['Ruby Woo'], 'Classic matte lipstick.'),
('Men''s Polo T-Shirt', 'US Polo Assn', '11111111-1111-1111-1111-111111111111', 899, 1499, 40, 'https://picsum.photos/seed/p14/400/500', ARRAY['M', 'L', 'XL', 'XXL'], 'Cotton polo t-shirt.'),
('Women''s High-Waist Jeans', 'Zara', '22222222-2222-2222-2222-222222222222', 1999, 2999, 33, 'https://picsum.photos/seed/p15/400/500', ARRAY['26', '28', '30', '32'], 'Trendy high-waist straight fit jeans.'),
('Kids Light-up Shoes', 'Skechers', '66666666-6666-6666-6666-666666666666', 1799, 2499, 28, 'https://picsum.photos/seed/p16/400/500', ARRAY['11C', '12C', '13C'], 'Fun light-up sneakers for kids.'),
('Cotton Bedsheet', 'Bombay Dyeing', '44444444-4444-4444-4444-444444444444', 1199, 1999, 40, 'https://picsum.photos/seed/p17/400/500', ARRAY['Double', 'King'], 'Premium pure cotton bedsheet with pillow covers.'),
('Vitamin C Face Wash', 'Mamaearth', '55555555-5555-5555-5555-555555555555', 249, 299, 16, 'https://picsum.photos/seed/p18/400/500', ARRAY['100ml'], 'Refreshing vitamin c face wash.'),
('Men''s Running Shorts', 'Under Armour', '11111111-1111-1111-1111-111111111111', 1299, 1999, 35, 'https://picsum.photos/seed/p19/400/500', ARRAY['S', 'M', 'L'], 'Breathable running shorts.'),
('Women''s Maxi Skirt', 'Vero Moda', '22222222-2222-2222-2222-222222222222', 1499, 2299, 34, 'https://picsum.photos/seed/p20/400/500', ARRAY['S', 'M', 'L'], 'Flowy maxi skirt with side slit.'),
('Men''s Leather Loafers', 'Hush Puppies', '66666666-6666-6666-6666-666666666666', 3999, 5999, 33, 'https://picsum.photos/seed/p21/400/500', ARRAY['7', '8', '9', '10'], 'Premium genuine leather loafers.'),
('Kids Winter Jacket', 'United Colors of Benetton', '33333333-3333-3333-3333-333333333333', 1899, 2999, 36, 'https://picsum.photos/seed/p22/400/500', ARRAY['5Y', '6Y', '7Y'], 'Warm and cozy winter jacket.'),
('Aroma Diffuser', 'Miniso', '44444444-4444-4444-4444-444444444444', 799, 1299, 38, 'https://picsum.photos/seed/p23/400/500', ARRAY['One Size'], 'Ultrasonic aroma humidifier and diffuser.'),
('Liquid Eyeliner', 'Maybelline', '55555555-5555-5555-5555-555555555555', 349, 499, 30, 'https://picsum.photos/seed/p24/400/500', ARRAY['Black'], 'Waterproof liquid eyeliner.'),
('Men''s Casual Shirt', 'Wrangler', '11111111-1111-1111-1111-111111111111', 1199, 1899, 36, 'https://picsum.photos/seed/p25/400/500', ARRAY['M', 'L', 'XL'], 'Checkered casual shirt.'),
('Women''s Handbag', 'Baggit', '22222222-2222-2222-2222-222222222222', 1599, 2499, 36, 'https://picsum.photos/seed/p26/400/500', ARRAY['One Size'], 'Spacious synthetic leather handbag.'),
('Women''s Heels', 'Steve Madden', '66666666-6666-6666-6666-666666666666', 4999, 7999, 37, 'https://picsum.photos/seed/p27/400/500', ARRAY['5', '6', '7', '8'], 'Elegant stiletto heels.'),
('Kids Party Dress', 'Peppermint', '33333333-3333-3333-3333-333333333333', 1299, 1999, 35, 'https://picsum.photos/seed/p28/400/500', ARRAY['4Y', '6Y', '8Y'], 'Beautiful party dress for girls.'),
('Set of 4 Cushion Covers', 'Home Centre', '44444444-4444-4444-4444-444444444444', 499, 799, 37, 'https://picsum.photos/seed/p29/400/500', ARRAY['16x16'], 'Embroidered cushion covers.'),
('Sunscreen Lotion SPF 50', 'Neutrogena', '55555555-5555-5555-5555-555555555555', 549, 699, 21, 'https://picsum.photos/seed/p30/400/500', ARRAY['88ml'], 'Ultra sheer dry touch sunscreen.')
ON CONFLICT DO NOTHING;
-- safety_assessments
CREATE TABLE safety_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'logistic_regression',
  risk_score NUMERIC(6,5) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  ml_risk_level TEXT NOT NULL CHECK (ml_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  final_risk_level TEXT NOT NULL CHECK (final_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  decision_source TEXT NOT NULL CHECK (decision_source IN ('ML', 'RULE_OVERRIDE')),
  override_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (decision_source = 'ML' AND override_reason IS NULL) OR
    (decision_source = 'RULE_OVERRIDE' AND override_reason IS NOT NULL)
  ),
  CHECK (completed_at >= started_at)
);

CREATE INDEX idx_safety_assessments_user_id ON safety_assessments(user_id);
CREATE INDEX idx_safety_assessments_session_id ON safety_assessments(session_id);
CREATE INDEX idx_safety_assessments_created_at ON safety_assessments(created_at);
CREATE INDEX idx_safety_assessments_final_risk ON safety_assessments(final_risk_level);

-- safety_assessment_answers
CREATE TABLE safety_assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES safety_assessments(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL CHECK (question_key IN ('safe_now', 'perpetrator_present', 'can_leave_safely', 'medical_help', 'contact_requested')),
  answer_value BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_key)
);

CREATE INDEX idx_safety_assessment_answers_assessment_id ON safety_assessment_answers(assessment_id);

-- safety_cases
CREATE TABLE safety_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id UUID UNIQUE REFERENCES safety_assessments(id) ON DELETE SET NULL,
  case_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (case_status IN ('OPEN', 'ESCALATED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_accuracy_m NUMERIC(10,2) CHECK (location_accuracy_m >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_safety_cases_user_id ON safety_cases(user_id);
CREATE INDEX idx_safety_cases_assessment_id ON safety_cases(assessment_id);
CREATE INDEX idx_safety_cases_case_status ON safety_cases(case_status);
CREATE INDEX idx_safety_cases_created_at ON safety_cases(created_at);

-- Apply RLS
ALTER TABLE safety_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_cases ENABLE ROW LEVEL SECURITY;
-- RPC for atomic safety assessment insertion
CREATE OR REPLACE FUNCTION insert_safety_assessment(
  p_assessment_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_answers JSONB,
  p_ml_risk_level TEXT,
  p_ml_confidence NUMERIC,
  p_final_risk_level TEXT,
  p_decision_source TEXT,
  p_override_reason TEXT,
  p_model_version TEXT,
  p_started_at TIMESTAMPTZ,
  p_completed_at TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  v_existing_assessment UUID;
  v_existing_case UUID;
  v_new_case_id UUID := NULL;
  v_case_created BOOLEAN := FALSE;
  v_question_key TEXT;
  v_answer_value BOOLEAN;
  v_valid_keys TEXT[] := ARRAY['safe_now', 'perpetrator_present', 'can_leave_safely', 'medical_help', 'contact_requested'];
BEGIN
  -- 1. Idempotency Check
  SELECT id INTO v_existing_assessment FROM safety_assessments WHERE id = p_assessment_id;
  IF FOUND THEN
    SELECT id INTO v_existing_case FROM safety_cases WHERE assessment_id = p_assessment_id;
    RETURN jsonb_build_object(
      'status', 'success',
      'assessment_id', v_existing_assessment,
      'case_created', (v_existing_case IS NOT NULL),
      'case_id', v_existing_case
    );
  END IF;

  -- 2. Validate Inputs
  IF p_ml_confidence < 0 OR p_ml_confidence > 1 THEN
    RAISE EXCEPTION 'Confidence must be between 0 and 1';
  END IF;

  IF p_ml_risk_level NOT IN ('LOW', 'MEDIUM', 'HIGH') OR p_final_risk_level NOT IN ('LOW', 'MEDIUM', 'HIGH') THEN
    RAISE EXCEPTION 'Invalid risk level';
  END IF;

  IF p_decision_source NOT IN ('ML', 'RULE_OVERRIDE') THEN
    RAISE EXCEPTION 'Invalid decision source';
  END IF;

  -- Verify all 5 keys exist in JSONB
  FOREACH v_question_key IN ARRAY v_valid_keys
  LOOP
    IF NOT (p_answers ? v_question_key) THEN
      RAISE EXCEPTION 'Missing required answer key: %', v_question_key;
    END IF;
  END LOOP;

  -- 3. Insert Assessment
  INSERT INTO safety_assessments (
    id, user_id, session_id, model_version, risk_score,
    ml_risk_level, final_risk_level, decision_source, override_reason,
    started_at, completed_at
  ) VALUES (
    p_assessment_id, p_user_id, p_session_id, p_model_version, p_ml_confidence,
    p_ml_risk_level, p_final_risk_level, p_decision_source, p_override_reason,
    p_started_at, p_completed_at
  );

  -- 4. Insert Answers
  FOR v_question_key, v_answer_value IN
    SELECT key, value::boolean FROM jsonb_each_text(p_answers)
  LOOP
    IF v_question_key = ANY(v_valid_keys) THEN
      INSERT INTO safety_assessment_answers (assessment_id, question_key, answer_value)
      VALUES (p_assessment_id, v_question_key, v_answer_value);
    ELSE
      RAISE EXCEPTION 'Invalid question key: %', v_question_key;
    END IF;
  END LOOP;

  -- 5. Insert Case if HIGH
  IF p_final_risk_level = 'HIGH' THEN
    INSERT INTO safety_cases (user_id, assessment_id, case_status, risk_level)
    VALUES (p_user_id, p_assessment_id, 'OPEN', 'HIGH')
    RETURNING id INTO v_new_case_id;
    v_case_created := TRUE;
  END IF;

  -- 6. Return Success
  RETURN jsonb_build_object(
    'status', 'success',
    'assessment_id', p_assessment_id,
    'case_created', v_case_created,
    'case_id', v_new_case_id
  );
END;
$$ LANGUAGE plpgsql;
