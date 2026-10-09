/* =====================================================
   DARKKNIGHT STUDIO — Cart (logged-in users via DB)
   ===================================================== */

window.Cart = {
  async getOrCreateCart() {
    const user = await DK.getUser();
    if (!user) throw new Error('برای افزودن به سبد وارد شوید');
    let { data: cart } = await DK.supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!cart) {
      const { data, error } = await DK.supabase
        .from('carts')
        .insert({ user_id: user.id })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      cart = data;
    }
    return cart;
  },

  async add(productId, qty = 1) {
    const cart = await this.getOrCreateCart();
    const { data: existing } = await DK.supabase
      .from('cart_items')
      .select('id,quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const { error } = await DK.supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + qty })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await DK.supabase
        .from('cart_items')
        .insert({ cart_id: cart.id, product_id: productId, quantity: qty });
      if (error) throw error;
    }
    return true;
  },

  async list() {
    const user = await DK.getUser();
    if (!user) return [];
    const { data: cart } = await DK.supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!cart) return [];
    const { data, error } = await DK.supabase
      .from('cart_items')
      .select('id,quantity,product_id,products(id,name,slug,price,sale_price,cover_url)')
      .eq('cart_id', cart.id);
    if (error) throw error;
    return data || [];
  },

  async remove(itemId) {
    const { error } = await DK.supabase.from('cart_items').delete().eq('id', itemId);
    if (error) throw error;
  }
};
