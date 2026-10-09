/* =====================================================
   DARKKNIGHT STUDIO — Shop listing
   ===================================================== */

const Shop = {
  page: 0,
  pageSize: 12,
  category: null,
  search: '',

  async init() {
    if (!DK.isConfigured) DK.initSupabase();
    document.getElementById('year').textContent = new Date().getFullYear();

    const toggle = DK.$('#menu-toggle');
    const nav = DK.$('#nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        toggle.classList.toggle('open');
      });
    }

    this.category = DK.query.get('cat') || null;
    await this.loadCategories();
    await this.loadProducts();

    DK.$('#shop-search')?.addEventListener('input', DK.debounce(e => {
      this.search = e.target.value.trim();
      this.page = 0;
      this.loadProducts();
    }, 300));
  },

  async loadCategories() {
    const list = DK.$('#cat-list');
    if (!list) return;
    try {
      const { data } = await DK.supabase
        .from('product_categories')
        .select('name,slug,icon')
        .eq('is_active', true)
        .order('display_order');

      if (!data) return;

      const all = list.querySelector('[data-slug=""]');
      if (this.category) all?.classList.remove('active');

      data.forEach(c => {
        const a = document.createElement('a');
        a.href = 'shop.html?cat=' + encodeURIComponent(c.slug);
        a.dataset.slug = c.slug;
        a.textContent = (c.icon ? c.icon + ' ' : '') + c.name;
        if (c.slug === this.category) a.classList.add('active');
        list.appendChild(a);
      });
    } catch (e) {
      console.warn('[Shop] categories', e);
    }
  },

  async loadProducts() {
    const grid = DK.$('#products-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

    try {
      let q = DK.supabase
        .from('products')
        .select('id,name,slug,short_description,price,sale_price,cover_url,category_id', { count: 'exact' })
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (this.category) {
        const { data: cat } = await DK.supabase
          .from('product_categories')
          .select('id')
          .eq('slug', this.category)
          .maybeSingle();
        if (cat) q = q.eq('category_id', cat.id);
      }

      if (this.search) {
        q = q.or(`name.ilike.%${this.search}%,short_description.ilike.%${this.search}%`);
      }

      const from = this.page * this.pageSize;
      q = q.range(from, from + this.pageSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;

      if (!data || !data.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>محصولی یافت نشد</p><p class="text-muted" style="font-size:0.85rem">پس از اجرای migration و افزودن محصول توسط ادمین، اینجا نمایش داده می‌شود.</p></div>';
        return;
      }

      grid.innerHTML = data.map(p => `
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="card product-card">
          ${p.cover_url
            ? `<img class="product-card-img" src="${DK.escape(p.cover_url)}" alt="${DK.escape(p.name)}" loading="lazy">`
            : `<div class="product-card-img" style="display:flex;align-items:center;justify-content:center;opacity:0.4;font-size:2rem">⚔</div>`}
          <div class="product-card-body">
            <h3 class="card-title">${DK.escape(p.name)}</h3>
            <p class="text-muted" style="font-size:0.85rem;flex:1">${DK.escape(p.short_description || '')}</p>
            <div class="product-price">
              ${p.sale_price != null
                ? `<span>${DK.formatPrice(p.sale_price)}</span><span class="price-old">${DK.formatPrice(p.price)}</span>`
                : `<span>${DK.formatPrice(p.price)}</span>`}
            </div>
          </div>
        </a>`).join('');

      this.renderPagination(count || 0);
    } catch (e) {
      console.warn('[Shop] products', e);
      grid.innerHTML = '<div class="empty-state"><p>فروشگاه در حال آماده‌سازی است. migration شماره ۴ را در Supabase اجرا کنید.</p></div>';
    }
  },

  renderPagination(total) {
    const el = DK.$('#shop-pagination');
    if (!el) return;
    const pages = Math.ceil(total / this.pageSize);
    if (pages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 0; i < pages; i++) {
      html += `<button class="btn btn-sm ${i === this.page ? 'btn-primary' : 'btn-ghost'}" data-page="${i}" style="margin:0 0.2rem">${(i + 1).toLocaleString('fa-IR')}</button>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.page = parseInt(btn.dataset.page, 10);
        this.loadProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Shop.init());
