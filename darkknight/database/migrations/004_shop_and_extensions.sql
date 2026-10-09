-- =====================================================
-- DARKKNIGHT STUDIO — Migration 004
-- Shop, Orders, Cart, Membership extensions, Analytics
-- INCREMENTAL — does not drop existing tables/data
-- Run in Supabase SQL Editor after reviewing
-- =====================================================

-- ========== PRODUCT CATEGORIES ==========
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📦',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO product_categories (name, name_en, slug, display_order) VALUES
  ('ربات‌های پیام‌رسان', 'Messenger Bots', 'messenger-bots', 1),
  ('ربات‌های مدیریتی', 'Management Bots', 'management-bots', 2),
  ('ربات‌های سرگرمی', 'Entertainment Bots', 'entertainment-bots', 3),
  ('ربات‌های اقتصادی و بازی', 'Economy & Game Bots', 'economy-game-bots', 4),
  ('سورس‌کدها', 'Source Codes', 'source-codes', 5),
  ('پروژه‌های آماده', 'Ready Projects', 'ready-projects', 6),
  ('وب‌سایت‌ها', 'Websites', 'websites', 7),
  ('ابزارهای توسعه‌دهندگان', 'Developer Tools', 'dev-tools', 8),
  ('محصولات سفارشی', 'Custom Products', 'custom', 9),
  ('سایر محصولات دیجیتال', 'Other Digital', 'other', 10)
ON CONFLICT (slug) DO NOTHING;

-- ========== PRODUCTS ==========
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  version TEXT DEFAULT '1.0.0',
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  price NUMERIC(12,0) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,0),
  currency TEXT NOT NULL DEFAULT 'IRR',
  stock INT, -- null = unlimited
  max_per_user INT DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  cover_url TEXT,
  gallery JSONB DEFAULT '[]',
  tech_specs JSONB DEFAULT '{}',
  requirements TEXT,
  install_guide TEXT,
  license_terms TEXT,
  support_policy TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;

-- ========== PRODUCT FILES (private downloadables) ==========
CREATE TABLE IF NOT EXISTS product_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  changelog TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_files_product ON product_files(product_id);

-- ========== DISCOUNT CODES ==========
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC(12,2) NOT NULL,
  min_order NUMERIC(12,0) DEFAULT 0,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== CARTS ==========
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- for anonymous (optional)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cart_id, product_id)
);

-- ========== ORDERS ==========
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'paid', 'processing',
      'ready', 'delivered', 'cancelled', 'refunded'
    )),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending_review', 'paid', 'failed', 'refunded')),
  subtotal NUMERIC(12,0) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  total NUMERIC(12,0) NOT NULL DEFAULT 0,
  discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'IRR',
  payment_ref TEXT,
  payment_method TEXT DEFAULT 'manual',
  notes TEXT,
  admin_notes TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL, -- snapshot
  unit_price NUMERIC(12,0) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_price NUMERIC(12,0) NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,0) NOT NULL,
  method TEXT,
  reference TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_file_id UUID NOT NULL REFERENCES product_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hint TEXT
);

-- ========== MEMBERSHIP REQUESTS (extend existing team_applications) ==========
-- Add columns if not present (safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_applications' AND column_name='mobile') THEN
    ALTER TABLE team_applications ADD COLUMN mobile TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_applications' AND column_name='email') THEN
    ALTER TABLE team_applications ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_applications' AND column_name='messenger_username') THEN
    ALTER TABLE team_applications ADD COLUMN messenger_username TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_applications' AND column_name='github_url') THEN
    ALTER TABLE team_applications ADD COLUMN github_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_applications' AND column_name='interest_area') THEN
    ALTER TABLE team_applications ADD COLUMN interest_area TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_applications' AND column_name='admin_notes') THEN
    ALTER TABLE team_applications ADD COLUMN admin_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_applications' AND column_name='reviewed_by') THEN
    ALTER TABLE team_applications ADD COLUMN reviewed_by UUID REFERENCES admins(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Expand status values if needed (existing: PENDING, ACCEPTED, REJECTED, ARCHIVED)
-- New statuses handled in app layer; optional constraint update later

-- ========== NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'general',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ========== ANALYTICS EVENTS (privacy-friendly) ==========
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  page TEXT,
  referrer TEXT,
  device_category TEXT,
  browser_name TEXT,
  language TEXT,
  screen_w INT,
  screen_h INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics_events(page, created_at DESC);

-- ========== ACTIVE SESSIONS (approximate online) ==========
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_id TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  page TEXT,
  device_category TEXT,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_seen ON active_sessions(last_seen DESC);

-- ========== ROLE PERMISSIONS refinement (optional new table) ==========
-- Keep using roles.permissions JSONB for compatibility.
-- New permission keys are documented in js/permissions.js

-- ========== HELPERS ==========
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  num TEXT;
BEGIN
  num := 'DK-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));
  RETURN num;
END;
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_products_updated') THEN
    CREATE TRIGGER tr_products_updated BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_orders_updated') THEN
    CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Note: RLS policies for new tables are in 005_shop_rls.sql
