/* =====================================================
   DARKKNIGHT STUDIO — Homepage data loaders
   ===================================================== */

window.DK = window.DK || {};

const Home = {
  async init() {
    if (!DK.isConfigured) DK.initSupabase();

    document.getElementById('year').textContent = new Date().getFullYear();
    this.bindMobileMenu();
    this.bindHeaderScroll();

    if (!DK.isConfigured) {
      this.showEmptyAll();
      return;
    }

    await Promise.all([
      this.loadStats(),
      this.loadFeaturedProducts(),
      this.loadProjects(),
      this.loadCategories(),
      this.loadTeam(),
      this.loadSocialLinks()
    ]);
  },

  bindMobileMenu() {
    const toggle = DK.$('#menu-toggle');
    const nav = DK.$('#nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  },

  bindHeaderScroll() {
    const header = DK.$('#header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', DK.throttle(onScroll, 50), { passive: true });
    onScroll();
  },

  showEmptyAll() {
    ['featured-products-grid', 'projects-grid', 'categories-grid', 'team-grid'].forEach(id => {
      const el = DK.$('#' + id);
      if (el) el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚔</div><p>داده در دسترس نیست</p></div>';
    });
  },

  async loadStats() {
    try {
      // Use existing statistics table + counts
      const [statsRes, prodCount, projCount, memberCount] = await Promise.all([
        DK.db.select('statistics', { select: 'key,value,is_visible' }),
        DK.db.count('products', { eq: { is_published: true } }),
        DK.db.count('projects', { eq: { status: 'ONLINE' } }).catch(() =>
          DK.db.count('projects')),
        DK.db.count('team_members', { eq: { is_visible: true } })
      ]);

      const map = {};
      (statsRes.data || []).forEach(s => { map[s.key] = s.value; });

      const set = (key, val) => {
        const el = document.querySelector(`[data-stat="${key}"]`);
        if (el) el.textContent = (val != null ? Number(val) : 0).toLocaleString('fa-IR');
      };

      set('projects', projCount.count ?? map.projects ?? 0);
      set('products', prodCount.count ?? 0);
      set('members', memberCount.count ?? map.members ?? 0);
      set('views', map.total_views ?? 0);
    } catch (e) {
      console.warn('[Home] stats', e);
    }
  },

  async loadFeaturedProducts() {
    const grid = DK.$('#featured-products-grid');
    if (!grid) return;
    try {
      const { data, error } = await DK.supabase
        .from('products')
        .select('id,name,slug,short_description,price,sale_price,cover_url,is_featured')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      if (!data || !data.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>هنوز محصولی منتشر نشده است</p></div>';
        return;
      }

      grid.innerHTML = data.map(p => `
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="card product-card">
          ${p.cover_url
            ? `<img class="product-card-img" src="${DK.escape(p.cover_url)}" alt="${DK.escape(p.name)}" loading="lazy">`
            : `<div class="product-card-img" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)">⚔</div>`}
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
    } catch (e) {
      // Table may not exist yet before migration
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>فروشگاه در حال آماده‌سازی است</p></div>';
    }
  },

  async loadProjects() {
    const grid = DK.$('#projects-grid');
    if (!grid) return;
    try {
      const { data, error } = await DK.supabase
        .from('projects')
        .select('id,title,description,logo_url,banner_url,status,version')
        .neq('status', 'ARCHIVED')
        .order('display_order', { ascending: true })
        .limit(6);

      if (error) throw error;
      if (!data || !data.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚔</div><p>پروژه‌ای ثبت نشده</p></div>';
        return;
      }

      const statusLabel = { ONLINE: 'آنلاین', OFFLINE: 'آفلاین', IN_DEVELOPMENT: 'در حال توسعه' };

      grid.innerHTML = data.map(p => `
        <a href="project.html?id=${p.id}" class="card project-card">
          ${p.banner_url || p.logo_url
            ? `<img class="project-card-img" src="${DK.escape(p.banner_url || p.logo_url)}" alt="" loading="lazy">`
            : `<div class="project-card-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;opacity:0.4">⚔</div>`}
          <div class="project-card-body">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem">
              <h3 class="card-title">${DK.escape(p.title)}</h3>
              <span class="badge">${statusLabel[p.status] || p.status}</span>
            </div>
            <p class="text-muted" style="font-size:0.85rem">${DK.escape((p.description || '').slice(0, 120))}</p>
            ${p.version ? `<span class="card-meta">v${DK.escape(p.version)}</span>` : ''}
          </div>
        </a>`).join('');
    } catch (e) {
      grid.innerHTML = '<div class="empty-state"><p>خطا در بارگذاری پروژه‌ها</p></div>';
    }
  },

  async loadCategories() {
    const grid = DK.$('#categories-grid');
    if (!grid) return;
    try {
      const { data, error } = await DK.supabase
        .from('product_categories')
        .select('name,slug,icon,description')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      if (!data || !data.length) {
        grid.innerHTML = '<div class="empty-state"><p>دسته‌بندی‌ها پس از اجرای migration نمایش داده می‌شوند</p></div>';
        return;
      }

      grid.innerHTML = data.map(c => `
        <a href="shop.html?cat=${encodeURIComponent(c.slug)}" class="card" style="text-align:center">
          <div style="font-size:1.75rem;margin-bottom:0.5rem">${c.icon || '📦'}</div>
          <h3 style="font-size:1rem">${DK.escape(c.name)}</h3>
        </a>`).join('');
    } catch (e) {
      grid.innerHTML = '<div class="empty-state"><p>دسته‌بندی در دسترس نیست</p></div>';
    }
  },

  async loadTeam() {
    const grid = DK.$('#team-grid');
    if (!grid) return;
    try {
      const { data, error } = await DK.supabase
        .from('team_members')
        .select('name,role,bio,avatar_url')
        .eq('is_visible', true)
        .order('display_order')
        .limit(6);

      if (error) throw error;
      if (!data || !data.length) {
        grid.innerHTML = '<div class="empty-state"><p>اعضای تیم به‌زودی معرفی می‌شوند</p></div>';
        return;
      }

      grid.innerHTML = data.map(m => `
        <div class="card" style="text-align:center">
          ${m.avatar_url
            ? `<img src="${DK.escape(m.avatar_url)}" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 0.75rem" loading="lazy">`
            : `<div style="width:72px;height:72px;border-radius:50%;background:var(--accent-dim);margin:0 auto 0.75rem;display:flex;align-items:center;justify-content:center;font-weight:700">${(m.name||'?')[0]}</div>`}
          <h3 style="font-size:1.05rem">${DK.escape(m.name)}</h3>
          <p class="text-muted" style="font-size:0.85rem">${DK.escape(m.role || '')}</p>
        </div>`).join('');
    } catch (e) {
      grid.innerHTML = '<div class="empty-state"><p>—</p></div>';
    }
  },

  async loadSocialLinks() {
    const el = DK.$('#social-links');
    if (!el) return;
    try {
      const { data } = await DK.supabase
        .from('official_links')
        .select('title,url,icon')
        .eq('is_visible', true)
        .order('display_order');
      if (!data) return;
      el.innerHTML = data.map(l =>
        `<a href="${DK.escape(l.url)}" target="_blank" rel="noopener" title="${DK.escape(l.title)}">${l.icon || '🔗'}</a>`
      ).join('');
    } catch (e) { /* silent */ }
  }
};

document.addEventListener('DOMContentLoaded', () => Home.init());
