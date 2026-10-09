/* =====================================================
   DARKKNIGHT STUDIO — Auth UI & guards
   ===================================================== */

window.DK = window.DK || {};
const DK = window.DK;

const AuthUI = {
  async init() {
    if (!DK.isConfigured) DK.initSupabase();

    // Update header auth state on all pages
    await this.refreshHeaderAuth();

    window.addEventListener('dk:auth-change', () => this.refreshHeaderAuth());

    // Bind forms if present
    this.bindLoginForm();
    this.bindRegisterForm();
    this.bindLogout();
  },

  async refreshHeaderAuth() {
    const slot = DK.$('#auth-slot') || DK.$('.header-auth');
    if (!slot) return;

    const user = await DK.getUser();
    if (!user) {
      slot.innerHTML = `
        <a href="${DK.path('login.html')}" class="btn btn-ghost btn-sm">ورود</a>
        <a href="${DK.path('login.html')}?tab=register" class="btn btn-primary btn-sm">ثبت‌نام</a>`;
      return;
    }

    const profile = await DK.getProfile();
    const admin = await DK.getAdminProfile();
    const name = profile?.display_name || user.email?.split('@')[0] || 'کاربر';

    let adminLink = '';
    if (admin) {
      adminLink = `<a href="${DK.path('admin.html')}" class="btn btn-ghost btn-sm">پنل مدیریت</a>`;
      if (admin.roles?.name === 'OWNER') {
        adminLink += `<a href="${DK.path('owner.html')}" class="btn btn-ghost btn-sm">پنل مالک</a>`;
      }
    }

    slot.innerHTML = `
      <a href="${DK.path('profile.html')}" class="header-user">
        <span class="header-user-avatar">${(name[0] || 'U').toUpperCase()}</span>
        <span class="header-user-name">${DK.escape(name)}</span>
      </a>
      ${adminLink}
      <button type="button" class="btn btn-ghost btn-sm" id="btn-logout">خروج</button>`;
  },

  bindLoginForm() {
    const form = DK.$('#login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value;
      const btn = form.querySelector('[type="submit"]');
      const errEl = DK.$('#login-error');

      if (errEl) errEl.textContent = '';
      DK.setLoading(btn, true);

      try {
        await DK.signIn(email, password);
        DK.toast('ورود موفق', 'success');
        const redirect = DK.query.get('redirect') || 'profile.html';
        window.location.href = DK.path(redirect);
      } catch (err) {
        const msg = err.message || 'خطا در ورود';
        if (errEl) errEl.textContent = msg;
        DK.toast(msg, 'error');
      } finally {
        DK.setLoading(btn, false);
      }
    });
  },

  bindRegisterForm() {
    const form = DK.$('#register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value;
      const name = form.display_name?.value?.trim() || '';
      const btn = form.querySelector('[type="submit"]');
      const errEl = DK.$('#register-error');

      if (password.length < 6) {
        if (errEl) errEl.textContent = 'رمز عبور حداقل ۶ کاراکتر باشد';
        return;
      }

      if (errEl) errEl.textContent = '';
      DK.setLoading(btn, true);

      try {
        const { user } = await DK.signUp(email, password, { display_name: name });
        if (user) {
          // Ensure profile row (trigger may already create it)
          await DK.db.insert('profiles', {
            id: user.id,
            display_name: name || email.split('@')[0]
          }).catch(() => {});
        }
        DK.toast('ثبت‌نام انجام شد. در صورت نیاز ایمیل را تأیید کنید.', 'success');
        // Auto switch to login or redirect
        const tabLogin = DK.$('[data-tab="login"]');
        if (tabLogin) tabLogin.click();
      } catch (err) {
        const msg = err.message || 'خطا در ثبت‌نام';
        if (errEl) errEl.textContent = msg;
        DK.toast(msg, 'error');
      } finally {
        DK.setLoading(btn, false);
      }
    });
  },

  bindLogout() {
    document.addEventListener('click', async (e) => {
      if (e.target.closest('#btn-logout')) {
        e.preventDefault();
        await DK.signOut();
        DK.toast('از حساب خارج شدید', 'info');
        window.location.href = DK.path('index.html');
      }
    });
  },

  /**
   * Guard: redirect to login if not authenticated
   */
  async requireAuth(redirectTo) {
    const user = await DK.getUser();
    if (!user) {
      const current = encodeURIComponent(window.location.pathname.split('/').pop() || 'profile.html');
      window.location.href = DK.path('login.html') + '?redirect=' + current;
      return null;
    }
    return user;
  },

  /**
   * Guard: require admin role
   */
  async requireAdmin() {
    const user = await this.requireAuth();
    if (!user) return null;
    const admin = await DK.getAdminProfile();
    if (!admin) {
      DK.toast('دسترسی مجاز نیست', 'error');
      window.location.href = DK.path('index.html');
      return null;
    }
    return admin;
  },

  /**
   * Guard: require owner
   */
  async requireOwner() {
    const admin = await this.requireAdmin();
    if (!admin) return null;
    if (admin.roles?.name !== 'OWNER') {
      DK.toast('فقط مالک به این بخش دسترسی دارد', 'error');
      window.location.href = DK.path('admin.html');
      return null;
    }
    return admin;
  }
};

// Auto-run on pages that include this script
document.addEventListener('DOMContentLoaded', () => AuthUI.init());

window.AuthUI = AuthUI;
