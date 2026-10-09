/* =====================================================
   DARKKNIGHT STUDIO — Owner panel
   Requires email + password login (OWNER role only)
   ===================================================== */

const Owner = {
  admin: null,

  async init() {
    if (!DK.isConfigured) DK.initSupabase();

    const user = await DK.getUser();
    if (!user) {
      this.renderLoginForm();
      return;
    }

    this.admin = await DK.getAdminProfile();
    if (!this.admin || this.admin.roles?.name !== 'OWNER') {
      this.renderLoginForm('فقط مالک اصلی به این بخش دسترسی دارد.');
      await DK.signOut();
      return;
    }

    this.render();
    await this.loadSettings();
    await this.loadAdmins();
  },

  renderLoginForm(errorMsg) {
    document.getElementById('owner-app').innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:var(--bg-deep)">
        <div class="card" style="width:100%;max-width:400px">
          <div style="text-align:center;margin-bottom:1.25rem">
            <div style="font-size:2rem;margin-bottom:.5rem">⚔</div>
            <h1 style="font-size:1.25rem;margin-bottom:.25rem">پنل مالک</h1>
            <p class="text-muted" style="font-size:.9rem">Darkknight Studio — ورود Owner</p>
          </div>
          <form id="owner-login-form">
            <div class="form-group">
              <label for="owner-email">ایمیل</label>
              <input type="email" id="owner-email" name="email" required autocomplete="username" dir="ltr">
            </div>
            <div class="form-group">
              <label for="owner-password">رمز عبور</label>
              <input type="password" id="owner-password" name="password" required autocomplete="current-password" dir="ltr" minlength="6">
            </div>
            <p class="form-error" id="owner-login-error">${errorMsg ? DK.escape(errorMsg) : ''}</p>
            <button type="submit" class="btn btn-primary" style="width:100%">ورود</button>
          </form>
          <p style="text-align:center;margin-top:1rem">
            <a href="admin.html" class="btn btn-ghost btn-sm">پنل مدیریت</a>
            <a href="index.html" class="btn btn-ghost btn-sm">سایت</a>
          </p>
        </div>
      </div>`;

    document.getElementById('owner-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const errEl = document.getElementById('owner-login-error');
      const btn = form.querySelector('[type="submit"]');
      errEl.textContent = '';
      DK.setLoading(btn, true);
      try {
        await DK.signIn(form.email.value.trim(), form.password.value);
        const admin = await DK.getAdminProfile();
        if (!admin || admin.roles?.name !== 'OWNER') {
          await DK.signOut();
          errEl.textContent = 'فقط حساب OWNER مجاز است.';
          return;
        }
        this.admin = admin;
        this.render();
        await this.loadSettings();
        await this.loadAdmins();
        DK.toast('ورود موفق', 'success');
      } catch (err) {
        errEl.textContent = err.message || 'ایمیل یا رمز اشتباه است';
      } finally {
        DK.setLoading(btn, false);
      }
    });
  },

  render() {
    document.getElementById('owner-app').innerHTML = `
      <div class="dash-layout">
        <aside class="dash-sidebar">
          <div class="dash-brand"><span>⚔</span> پنل مالک</div>
          <nav class="dash-nav">
            <a href="#" data-panel="settings" class="active">تنظیمات سایت</a>
            <a href="#" data-panel="admins">ادمین‌ها</a>
            <a href="#" data-panel="audit">لاگ فعالیت</a>
            <a href="admin.html">پنل مدیریت ←</a>
            <a href="index.html">سایت</a>
            <a href="#" id="owner-logout">خروج</a>
          </nav>
        </aside>
        <main class="dash-main">
          <div class="dash-header">
            <h1 style="font-size:1.25rem;margin:0">پنل مالک Darkknight</h1>
          </div>
          <div id="panel-settings" class="dash-panel active"></div>
          <div id="panel-admins" class="dash-panel"></div>
          <div id="panel-audit" class="dash-panel"></div>
        </main>
      </div>`;

    document.querySelectorAll('.dash-nav a[data-panel]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + a.dataset.panel)?.classList.add('active');
        document.querySelectorAll('.dash-nav a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        if (a.dataset.panel === 'audit') this.loadAudit();
        if (a.dataset.panel === 'admins') this.loadAdmins();
      });
    });
    document.getElementById('owner-logout')?.addEventListener('click', async e => {
      e.preventDefault();
      await DK.signOut();
      this.admin = null;
      this.renderLoginForm();
      DK.toast('خارج شدید', 'info');
    });
  },

  async loadSettings() {
    const el = document.getElementById('panel-settings');
    try {
      const { data } = await DK.supabase.from('site_settings').select('key,value');
      const map = {};
      (data || []).forEach(s => { map[s.key] = s.value; });
      const maint = map.maintenance_mode === true || map.maintenance_mode === 'true';
      el.innerHTML = `
        <div class="card" style="max-width:520px">
          <h2 style="font-size:1.05rem;margin-bottom:1rem">تنظیمات عمومی</h2>
          <div class="form-group">
            <label>
              <input type="checkbox" id="maint-mode" ${maint ? 'checked' : ''}>
              حالت تعمیرات (Maintenance)
            </label>
          </div>
          <div class="form-group">
            <label for="site-title">عنوان سایت</label>
            <input type="text" id="site-title" value="${DK.escape(String(map.site_title || 'DARKKNIGHT STUDIO').replace(/^"|"$/g, ''))}">
          </div>
          <button type="button" class="btn btn-primary" id="save-settings">ذخیره</button>
        </div>`;
      document.getElementById('save-settings').onclick = async () => {
        const maintenance = document.getElementById('maint-mode').checked;
        const title = document.getElementById('site-title').value.trim();
        await DK.supabase.from('site_settings').upsert([
          { key: 'maintenance_mode', value: maintenance },
          { key: 'site_title', value: JSON.stringify(title) }
        ]);
        await DK.audit('settings.update', 'site_settings', null, { maintenance, title });
        DK.toast('ذخیره شد', 'success');
      };
    } catch (e) {
      el.innerHTML = `<p class="form-error">${DK.escape(e.message)}</p>`;
    }
  },

  async loadAdmins() {
    const el = document.getElementById('panel-admins');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase
        .from('admins')
        .select('id,display_name,is_active,created_at,roles(name),user_id')
        .order('created_at');
      el.innerHTML = !data?.length
        ? '<div class="empty-state"><p>ادمینی ثبت نشده</p></div>'
        : `<table class="dash-table"><thead><tr><th>نام</th><th>نقش</th><th>فعال</th><th>تاریخ</th></tr></thead>
           <tbody>${data.map(a => `<tr>
             <td>${DK.escape(a.display_name || a.user_id)}</td>
             <td>${DK.escape(a.roles?.name || '')}</td>
             <td>${a.is_active ? 'بله' : 'خیر'}</td>
             <td>${DK.formatDate(a.created_at)}</td>
           </tr>`).join('')}</tbody></table>
           <p class="form-hint" style="margin-top:1rem">برای افزودن ادمین جدید، از SQL Editor در Supabase استفاده کنید.</p>`;
    } catch (e) {
      el.innerHTML = `<p class="form-error">${DK.escape(e.message)}</p>`;
    }
  },

  async loadAudit() {
    const el = document.getElementById('panel-audit');
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      el.innerHTML = !data?.length
        ? '<div class="empty-state"><p>لاگی ثبت نشده</p></div>'
        : `<table class="dash-table"><thead><tr><th>عملیات</th><th>نوع</th><th>زمان</th></tr></thead>
           <tbody>${data.map(l => `<tr>
             <td>${DK.escape(l.action)}</td>
             <td>${DK.escape(l.entity_type || '')}</td>
             <td>${DK.formatDateTime(l.created_at)}</td>
           </tr>`).join('')}</tbody></table>`;
    } catch (e) {
      el.innerHTML = `<p class="form-error">${DK.escape(e.message)}</p>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Owner.init());
