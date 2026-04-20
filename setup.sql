-- ============================================================
-- ETERNO FASHION — Supabase Database Setup
-- Run this entire script in Supabase SQL Editor
-- Dashboard: https://supabase.com → Your Project → SQL Editor
-- ============================================================


-- ========================
-- 1. PROFILES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  email       TEXT,
  avatar_url  TEXT,
  role        TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- 2. PRODUCTS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  image_url   TEXT,
  category    TEXT DEFAULT 'Other',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- 3. CART ITEMS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity    INTEGER DEFAULT 1 CHECK (quantity > 0),
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);


-- ========================
-- 4. ROW LEVEL SECURITY
-- ========================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "profiles_select_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select"  ON public.profiles;
DROP POLICY IF EXISTS "products_select_all"    ON public.products;
DROP POLICY IF EXISTS "products_insert_admin"  ON public.products;
DROP POLICY IF EXISTS "products_update_admin"  ON public.products;
DROP POLICY IF EXISTS "products_delete_admin"  ON public.products;
DROP POLICY IF EXISTS "cart_all_own"           ON public.cart_items;

-- Profiles: own row access
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Profiles: admin can view ALL profiles (for customer list)
CREATE POLICY "profiles_admin_select"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Products: anyone can read
CREATE POLICY "products_select_all"
  ON public.products FOR SELECT
  USING (true);

-- Products: only admins can create
CREATE POLICY "products_insert_admin"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Products: only admins can update
CREATE POLICY "products_update_admin"
  ON public.products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Products: only admins can delete
CREATE POLICY "products_delete_admin"
  ON public.products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Cart: users manage only their own cart
CREATE POLICY "cart_all_own"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ========================
-- 5. AUTO-CREATE PROFILE ON SIGNUP
-- ========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: fire after new user created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ========================
-- 6. STORAGE BUCKET FOR PRODUCT IMAGES
-- ========================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "storage_select_all"    ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_admin"  ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_admin"  ON storage.objects;

CREATE POLICY "storage_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "storage_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "storage_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ========================
-- 7. MAKE YOURSELF AN ADMIN
-- ========================
-- IMPORTANT: After signing in with Google for the first time,
-- run this query to make your account an admin.
-- Replace 'your@email.com' with your actual Google email address.
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'your@email.com';
--
-- You can verify with:
-- SELECT id, email, role FROM public.profiles;


-- ========================
-- 8. SAMPLE PRODUCTS (Optional)
-- ========================
-- Uncomment below to add sample products for testing:
--
-- INSERT INTO public.products (name, description, price, category, image_url) VALUES
-- ('Vintage Levi''s Denim Jacket', 'Classic 90s Levi''s trucker jacket in light wash denim. Size M. Minor fading adds to the vintage charm.', 1299, 'Outerwear', 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400'),
-- ('Floral Midi Dress', 'Beautiful floral print midi dress in excellent condition. Fits UK 10. Perfect for summer outings.', 699, 'Dresses', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400'),
-- ('White Linen Shirt', 'Crisp white linen shirt, barely worn. Relaxed fit, Size L. Ideal for casual and semi-formal looks.', 449, 'Tops', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400'),
-- ('Brown Leather Tote Bag', 'Genuine leather tote in rich caramel brown. Spacious interior, minor wear on handles. Great condition.', 1599, 'Bags', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400');
