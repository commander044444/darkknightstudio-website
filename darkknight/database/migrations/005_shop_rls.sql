-- =====================================================
-- DARKKNIGHT STUDIO — RLS for Shop & new tables
-- Depends on is_admin() / is_owner() from 002_rls.sql
-- =====================================================

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Categories: public read active
CREATE POLICY "Public read active categories" ON product_categories
  FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admin manage categories" ON product_categories
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Products: public read published
CREATE POLICY "Public read published products" ON products
  FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "Admin manage products" ON products
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Product files: only admin or purchaser (via order ownership)
-- Direct select limited; signed URLs should be generated carefully
CREATE POLICY "Admin manage product files" ON product_files
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Owner read own product files via order" ON product_files
  FOR SELECT USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = product_files.product_id
        AND o.user_id = auth.uid()
        AND o.status IN ('paid', 'processing', 'ready', 'delivered')
        AND o.payment_status = 'paid'
    )
  );

-- Discount codes: no public read of full list; validate via RPC later
CREATE POLICY "Admin manage discounts" ON discount_codes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Authenticated read active discount by code" ON discount_codes
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Carts
CREATE POLICY "Users manage own cart" ON carts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin read carts" ON carts
  FOR SELECT USING (is_admin());

CREATE POLICY "Users manage own cart items" ON cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid())
  );

-- Orders
CREATE POLICY "Users read own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending_payment')
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage orders" ON orders
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users read own order items" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR is_admin()))
  );
CREATE POLICY "Users insert order items for own order" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "Admin manage order items" ON order_items
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Payment records
CREATE POLICY "Users read own payments" ON payment_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = payment_records.order_id AND (o.user_id = auth.uid() OR is_admin()))
  );
CREATE POLICY "Users insert payment for own order" ON payment_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = payment_records.order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "Admin manage payments" ON payment_records
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Download logs
CREATE POLICY "Users insert own download log" ON download_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own download logs" ON download_logs
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Notifications
CREATE POLICY "Users read own or global notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR is_global = true OR is_admin());
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage notifications" ON notifications
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Analytics: anyone can insert; only admin read
CREATE POLICY "Anyone insert analytics" ON analytics_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read analytics" ON analytics_events
  FOR SELECT USING (is_admin());

-- Active sessions
CREATE POLICY "Anyone upsert own session" ON active_sessions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admin read sessions" ON active_sessions
  FOR SELECT USING (is_admin());

GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated, anon;
