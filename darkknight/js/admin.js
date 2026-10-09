/* =====================================================
   DARKKNIGHT STUDIO — Admin panel (real data)
   ===================================================== */

const Admin = {
  admin: null,

  async init() {
    if (!DK.isConfigured) DK.initSupabase();
    this.admin = await AuthUI.requireAdmin();
    if (!this.admin) return;
    this.renderShell();
    await this.loadDashboard();
  },

  renderShell() {
    const isOwner = this.admin.roles?.name === 'OWNER';
    document.getElementById('admin-app').innerHTML = `
      <div class="dash-layout">
        <aside class="dash-sidebar">
          <div class="dash-brand"><span>⚔</span> پنل مدیریت</div>
          <nav class="dash-nav">
            <a href="#" data-panel="dashboard" class="active">داشبورد</a>
            <a href="#" data-panel="tickets">تیکت‌ها</a>
            <a href="#" data-panel="memberships">درخواست عضویت</a>
            <a href="#" data-panel="projects">پروژه‌ها</a>
            <a href="#" data-panel="products">محصولات</a>
            <a href="#" data-panel="orders">سفارش‌ها</a>
            <a href="#" data-panel="news">اخبار</a>
            ${isOwner ? '<a href="owner.html">پنل مالک ←</a>' : ''}
            <a href="index.html">بازگشت به سایت</a>
            <a href="#" id="admin-logout">خروج</a>
          </nav>
        </aside>
        <main class="dash-main">
          <div class="dash-header">
            <h1 id="panel-title" style="font-size:1.25rem;margin:0">داشبورد</h1>
            <span class="text-muted" style="font-size:.85rem">${DK.escape(this.admin.display_name || this.admin.roles?.name || '')}</span>
          </div>
          <div id="panel-dashboard" class="dash-panel active"></div>
          <div id="panel-tickets" class="dash-panel"></div>
          <div id="panel-memberships" class="dash-panel"></div>
          <div id="panel-projects" class="dash-panel"></div>
          <div id="panel-products" class="dash-panel"></div>
          <div id="panel-orders" class="dash-panel"></div>
          <div id="panel-news" class="dash-panel"></div>
        </main>
      </div>`;

    document.querySelectorAll('.dash-nav a[data-panel]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.showPanel(a.dataset.panel);
        document.querySelectorAll('.dash-nav a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
      });
    });
    document.getElementById('admin-logout')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await DK.signOut();
      location.href = 'login.html';
    });
  },

  showPanel(name) {
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('panel-' + name);
    if (el) el.classList.add('active');
    const titles = { dashboard: 'داشبورد', tickets: 'تیکت‌ها', memberships: 'درخواست عضویت', projects: 'پروژه‌ها', products: 'محصولات', orders: 'سفارش‌ها', news: 'اخبار' };
    document.getElementById('panel-title').textContent = titles[name] || name;
    if (name === 'tickets') this.loadTickets();
    if (name === 'memberships') this.loadMemberships();
    if (name === 'projects') this.loadProjects();
    if (name === 'products') this.loadProducts();
    if (name === 'orders') this.loadOrders();
    if (name === 'news') this.loadNews();
  },

  async loadDashboard() {
    const el = document.getElementById('panel-dashboard');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const counts = await Promise.all([
        DK.db.count('projects').catch(() => ({ count: 0 })),
        DK.db.count('tickets', { eq: { status: 'OPEN' } }).catch(() => ({ count: 0 })),
        DK.db.count('team_applications', { eq: { status: 'PENDING' } }).catch(() => ({ count: 0 })),
        DK.db.count('products', { eq: { is_published: true } }).catch(() => ({ count: 0 })),
        DK.db.count('orders').catch(() => ({ count: 0 })),
        DK.db.count('news', { eq: { status: 'PUBLISHED' } }).catch(() => ({ count: 0 })),
      ]);
      const labels = ['پروژه‌ها', 'تیکت باز', 'عضویت جدید', 'محصول منتشر', 'سفارش‌ها', 'اخبار'];
      el.innerHTML = `<div class="dash-stats">${counts.map((c, i) => `
        <div class="dash-stat">
          <div class="dash-stat-value">${(c.count || 0).toLocaleString('fa-IR')}</div>
          <div class="dash-stat-label">${labels[i]}</div>
        </div>`).join('')}</div>
        <p class="text-muted" style="font-size:.85rem">آمار از دیتابیس واقعی Supabase خوانده می‌شود. اعداد صفر ممکن است به‌معنای خالی بودن جدول یا نبود migration باشد.</p>`;
    } catch (e) {
      el.innerHTML = '<p class="text-muted">خطا در بارگذاری آمار</p>';
    }
  },

  async loadTickets() {
    const el = document.getElementById('panel-tickets');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(50);
      if (!data?.length) { el.innerHTML = '<div class="empty-state"><p>تیکتی نیست</p></div>'; return; }
      const st = { OPEN: 'باز', IN_PROGRESS: 'بررسی', WAITING: 'منتظر', CLOSED: 'بسته' };
      el.innerHTML = `<div style="overflow-x:auto"><table class="dash-table">
        <thead><tr><th>موضوع</th><th>نام</th><th>وضعیت</th><th>تاریخ</th><th></th></tr></thead>
        <tbody>${data.map(t => `
          <tr>
            <td>${DK.escape(t.subject)}</td>
            <td>${DK.escape(t.creator_name)}</td>
            <td><span class="badge">${st[t.status] || t.status}</span></td>
            <td>${DK.formatDate(t.created_at)}</td>
            <td><a class="btn btn-ghost btn-sm" href="support.html?token=${encodeURIComponent(t.access_token)}" target="_blank">مشاهده</a></td>
          </tr>`).join('')}</tbody></table></div>`;
    } catch (e) {
      el.innerHTML = `<p class="form-error">${DK.escape(e.message)}</p>`;
    }
  },

  async loadMemberships() {
    const el = document.getElementById('panel-memberships');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from('team_applications').select('*').order('created_at', { ascending: false }).limit(50);
      if (!data?.length) { el.innerHTML = '<div class="empty-state"><p>درخواستی نیست</p></div>'; return; }
      el.innerHTML = `<div style="overflow-x:auto"><table class="dash-table">
        <thead><tr><th>نام</th><th>موبایل</th><th>مهارت</th><th>وضعیت</th><th>تاریخ</th><th></th></tr></thead>
        <tbody>${data.map(m => `
          <tr>
            <td>${DK.escape(m.name)}</td>
            <td dir="ltr">${DK.escape(m.mobile || m.contact || '—')}</td>
            <td>${DK.escape((m.skills || '').slice(0, 40))}</td>
            <td><span class="badge">${DK.escape(m.status)}</span></td>
            <td>${DK.formatDate(m.created_at)}</td>
            <td>
              <button class="btn btn-sm btn-primary" data-accept="${m.id}">پذیرش</button>
              <button class="btn btn-sm btn-ghost" data-reject="${m.id}">رد</button>
            </td>
          </tr>`).join('')}</tbody></table></div>`;
      el.querySelectorAll('[data-accept]').forEach(btn => btn.onclick = async () => {
        await DK.supabase.from('team_applications').update({ status: 'ACCEPTED' }).eq('id', btn.dataset.accept);
        DK.toast('پذیرفته شد', 'success');
        this.loadMemberships();
      });
      el.querySelectorAll('[data-reject]').forEach(btn => btn.onclick = async () => {
        await DK.supabase.from('team_applications').update({ status: 'REJECTED' }).eq('id', btn.dataset.reject);
        DK.toast('رد شد', 'info');
        this.loadMemberships();
      });
    } catch (e) {
      el.innerHTML = `<p class="form-error">${DK.escape(e.message)}</p>`;
    }
  },

  async loadProjects() {
    const el = document.getElementById('panel-projects');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from('projects').select('id,title,status,version,updated_at').order('display_order');
      el.innerHTML = !data?.length
        ? '<div class="empty-state"><p>پروژه‌ای نیست</p></div>'
        : `<table class="dash-table"><thead><tr><th>عنوان</th><th>وضعیت</th><th>نسخه</th><th>به‌روزرسانی</th></tr></thead>
           <tbody>${data.map(p => `<tr><td>${DK.escape(p.title)}</td><td>${DK.escape(p.status)}</td><td>${DK.escape(p.version || '')}</td><td>${DK.formatDate(p.updated_at)}</td></tr>`).join('')}</tbody></table>`;
    } catch (e) {
      el.innerHTML = `<p class="form-error">${DK.escape(e.message)}</p>`;
    }
  },

  async loadProducts() {
    const el = document.getElementById('panel-products');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data, error } = await DK.supabase.from('products').select('id,name,price,sale_price,is_published,slug').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      el.innerHTML = !data?.length
        ? '<div class="empty-state"><p>محصولی نیست. ابتدا migration 004 را اجرا کنید و محصول اضافه کنید.</p></div>'
        : `<table class="dash-table"><thead><tr><th>نام</th><th>قیمت</th><th>منتشر</th><th></th></tr></thead>
           <tbody>${data.map(p => `<tr>
             <td>${DK.escape(p.name)}</td>
             <td>${DK.formatPrice(p.sale_price ?? p.price)}</td>
             <td>${p.is_published ? 'بله' : 'خیر'}</td>
             <td><a class="btn btn-ghost btn-sm" href="product.html?slug=${encodeURIComponent(p.slug)}">مشاهده</a></td>
           </tr>`).join('')}</tbody></table>`;
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p>جدول products در دسترس نیست. migration 004 را در Supabase اجرا کنید.</p><p class="text-muted" style="font-size:.85rem">${DK.escape(e.message)}</p></div>`;
    }
  },

  async loadOrders() {
    const el = document.getElementById('panel-orders');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data, error } = await DK.supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      el.innerHTML = !data?.length
        ? '<div class="empty-state"><p>سفارشی ثبت نشده</p></div>'
        : `<table class="dash-table"><thead><tr><th>شماره</th><th>وضعیت</th><th>پرداخت</th><th>مبلغ</th><th>تاریخ</th></tr></thead>
           <tbody>${data.map(o => `<tr>
             <td>${DK.escape(o.order_number)}</td>
             <td>${DK.escape(o.status)}</td>
             <td>${DK.escape(o.payment_status)}</td>
             <td>${DK.formatPrice(o.total)}</td>
             <td>${DK.formatDate(o.created_at)}</td>
           </tr>`).join('')}</tbody></table>`;
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><p>جدول orders آماده نیست (migration 004).</p></div>`;
    }
  },

  async loadNews() {
    const el = document.getElementById('panel-news');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from('news').select('id,title,status,published_at').order('created_at', { ascending: false }).limit(30);
      el.innerHTML = !data?.length
        ? '<div class="empty-state"><p>خبری نیست</p></div>'
        : `<table class="dash-table"><thead><tr><th>عنوان</th><th>وضعیت</th><th>انتشار</th></tr></thead>
           <tbody>${data.map(n => `<tr><td>${DK.escape(n.title)}</td><td>${DK.escape(n.status)}</td><td>${DK.formatDate(n.published_at)}</td></tr>`).join('')}</tbody></table>`;
    } catch (e) {
      el.innerHTML = `<p class="form-error">${DK.escape(e.message)}</p>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
