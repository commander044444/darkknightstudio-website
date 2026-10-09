/* =====================================================
   DARKKNIGHT STUDIO — Membership application form
   Uses existing team_applications table (+ new columns)
   ===================================================== */

const Membership = {
  init() {
    if (!DK.isConfigured) DK.initSupabase();

    const toggle = DK.$('#menu-toggle');
    const nav = DK.$('#nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        toggle.classList.toggle('open');
      });
    }

    const form = DK.$('#membership-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = DK.$('#membership-error');
      const btn = form.querySelector('[type="submit"]');
      if (errEl) errEl.textContent = '';

      const mobile = form.mobile.value.trim();
      if (!/^09\d{9}$/.test(mobile)) {
        if (errEl) errEl.textContent = 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)';
        return;
      }

      const row = {
        name: form.name.value.trim(),
        mobile,
        email: form.email.value.trim() || null,
        messenger_username: form.messenger_username?.value?.trim() || null,
        age: form.age?.value ? parseInt(form.age.value, 10) || null : null,
        skills: form.skills.value.trim(),
        interest_area: form.interest_area?.value?.trim() || null,
        experience: form.experience?.value?.trim() || null,
        portfolio: form.portfolio?.value?.trim() || null,
        github_url: form.github_url?.value?.trim() || null,
        message: form.message?.value?.trim() || null,
        contact: mobile, // legacy field compatibility
        status: 'PENDING'
      };

      // age column is INT in schema; if user typed range, store in message
      if (form.age?.value && isNaN(parseInt(form.age.value, 10))) {
        row.age = null;
        row.message = (row.message || '') + '\n[بازه سنی: ' + form.age.value.trim() + ']';
      }

      DK.setLoading(btn, true);
      try {
        const { error } = await DK.supabase.from('team_applications').insert(row);
        if (error) throw error;
        DK.toast('درخواست شما ثبت شد. نتیجه از طریق کانال ارتباطی اعلام می‌شود.', 'success');
        form.reset();
      } catch (err) {
        console.error(err);
        const msg = err.message || 'خطا در ثبت درخواست';
        if (errEl) errEl.textContent = msg;
        DK.toast(msg, 'error');
      } finally {
        DK.setLoading(btn, false);
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Membership.init());
