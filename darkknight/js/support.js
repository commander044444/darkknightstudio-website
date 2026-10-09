/* =====================================================
   DARKKNIGHT STUDIO — Support tickets (existing tables)
   ===================================================== */

const Support = {
  currentToken: null,
  currentTicketId: null,

  init() {
    if (!DK.isConfigured) DK.initSupabase();
    document.getElementById('year').textContent = new Date().getFullYear();

    const toggle = DK.$('#menu-toggle');
    const nav = DK.$('#nav');
    if (toggle && nav) toggle.onclick = () => { nav.classList.toggle('open'); toggle.classList.toggle('open'); };

    DK.$('#ticket-form')?.addEventListener('submit', (e) => this.createTicket(e));
    DK.$('#track-form')?.addEventListener('submit', (e) => this.trackTicket(e));
    DK.$('#reply-form')?.addEventListener('submit', (e) => this.reply(e));

    const token = DK.query.get('token');
    if (token) {
      DK.$('#track-token').value = token;
      this.loadByToken(token);
    }
  },

  randomToken() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  },

  async createTicket(e) {
    e.preventDefault();
    const form = e.target;
    const errEl = DK.$('#ticket-error');
    const btn = form.querySelector('[type="submit"]');
    if (errEl) errEl.textContent = '';
    DK.setLoading(btn, true);

    const token = this.randomToken();
    const row = {
      access_token: token,
      subject: form.subject.value.trim(),
      category: form.category.value,
      creator_name: form.creator_name.value.trim(),
      creator_email: form.creator_email.value.trim() || null,
      status: 'OPEN',
      priority: 'normal'
    };

    try {
      const { data: ticket, error } = await DK.supabase
        .from('tickets')
        .insert(row)
        .select('id,access_token')
        .maybeSingle();
      if (error) throw error;

      await DK.supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'visitor',
        sender_name: row.creator_name,
        content: form.message.value.trim()
      });

      DK.toast('تیکت ثبت شد', 'success');
      form.reset();
      // show token to user
      alert('تیکت شما ثبت شد.\n\nتوکن دسترسی (ذخیره کنید):\n' + token + '\n\nبا این توکن می‌توانید تیکت را پیگیری کنید.');
      this.loadByToken(token);
    } catch (err) {
      console.error(err);
      if (errEl) errEl.textContent = err.message || 'خطا در ثبت تیکت';
      DK.toast(err.message || 'خطا', 'error');
    } finally {
      DK.setLoading(btn, false);
    }
  },

  async trackTicket(e) {
    e.preventDefault();
    const token = DK.$('#track-token').value.trim();
    if (!token) return;
    await this.loadByToken(token);
  },

  async loadByToken(token) {
    this.currentToken = token;
    try {
      const { data: ticket, error } = await DK.supabase
        .from('tickets')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();
      if (error) throw error;
      if (!ticket) {
        DK.toast('تیکت یافت نشد', 'error');
        return;
      }
      this.currentTicketId = ticket.id;

      const { data: messages } = await DK.supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      DK.$('#tv-subject').textContent = ticket.subject;
      const statusMap = { OPEN: 'باز', IN_PROGRESS: 'در حال بررسی', WAITING: 'منتظر پاسخ', CLOSED: 'بسته' };
      DK.$('#tv-status').textContent = statusMap[ticket.status] || ticket.status;

      const box = DK.$('#tv-messages');
      box.innerHTML = (messages || []).map(m => `
        <div style="padding:.75rem;border-radius:var(--radius);background:${m.sender_type === 'admin' ? 'var(--accent-dim)' : 'var(--bg-secondary)'};border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-muted);margin-bottom:.35rem">
            <span>${DK.escape(m.sender_name || m.sender_type)}</span>
            <span>${DK.formatDateTime(m.created_at)}</span>
          </div>
          <div style="white-space:pre-wrap;font-size:.95rem">${DK.escape(m.content)}</div>
        </div>`).join('') || '<p class="text-muted">پیامی نیست</p>';

      DK.$('#ticket-view').style.display = 'block';
      DK.query.set({ token });
    } catch (err) {
      console.error(err);
      DK.toast(err.message || 'خطا', 'error');
    }
  },

  async reply(e) {
    e.preventDefault();
    if (!this.currentTicketId) return;
    const msg = DK.$('#reply-msg').value.trim();
    if (!msg) return;
    const btn = e.target.querySelector('[type="submit"]');
    DK.setLoading(btn, true);
    try {
      const { data: ticket } = await DK.supabase
        .from('tickets')
        .select('creator_name,status')
        .eq('id', this.currentTicketId)
        .maybeSingle();
      if (ticket?.status === 'CLOSED') {
        DK.toast('این تیکت بسته شده است', 'error');
        return;
      }
      const { error } = await DK.supabase.from('ticket_messages').insert({
        ticket_id: this.currentTicketId,
        sender_type: 'visitor',
        sender_name: ticket?.creator_name || 'کاربر',
        content: msg
      });
      if (error) throw error;
      DK.$('#reply-msg').value = '';
      await this.loadByToken(this.currentToken);
      DK.toast('پیام ارسال شد', 'success');
    } catch (err) {
      DK.toast(err.message || 'خطا', 'error');
    } finally {
      DK.setLoading(btn, false);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Support.init());
