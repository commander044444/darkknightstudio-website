/* =====================================================
   DARKKNIGHT STUDIO — Utility helpers
   ===================================================== */

window.DK = window.DK || {};
const DK = window.DK;

/* DOM helpers */
DK.$ = (sel, ctx = document) => ctx.querySelector(sel);
DK.$$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

DK.on = (el, event, handler, opts) => {
  if (typeof el === 'string') el = DK.$(el);
  if (el) el.addEventListener(event, handler, opts);
};

DK.debounce = (fn, wait = 100) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

DK.throttle = (fn, wait = 100) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
};

/* Formatting */
DK.formatPrice = (amount, currency = 'تومان') => {
  if (amount == null || isNaN(amount)) return '—';
  const n = Number(amount);
  return n.toLocaleString('fa-IR') + ' ' + currency;
};

DK.formatDate = (iso, opts = {}) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...opts
    });
  } catch {
    return iso;
  }
};

DK.formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

DK.relativeTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return mins + ' دقیقه پیش';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' ساعت پیش';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + ' روز پیش';
  return DK.formatDate(iso);
};

/* Path helper for GitHub Pages subfolder */
DK.path = (relative) => {
  const base = (window.DK_CONFIG && window.DK_CONFIG.BASE_PATH) || '';
  if (!relative) return base || '/';
  if (relative.startsWith('http') || relative.startsWith('//')) return relative;
  const clean = relative.replace(/^\//, '');
  return (base ? base.replace(/\/$/, '') + '/' : '') + clean;
};

/* Toast / feedback */
DK.toast = function (message, type = 'info', duration = 3500) {
  let container = DK.$('#dk-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dk-toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'dk-toast dk-toast--' + type;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
};

/* Loading overlay on element */
DK.setLoading = (el, loading = true) => {
  if (typeof el === 'string') el = DK.$(el);
  if (!el) return;
  if (loading) {
    el.classList.add('is-loading');
    el.setAttribute('aria-busy', 'true');
  } else {
    el.classList.remove('is-loading');
    el.removeAttribute('aria-busy');
  }
};

/* Escape HTML */
DK.escape = (str) => {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};

/* Generate simple UUID-like id (client side only, not for security) */
DK.uid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

/* Device category (approximate, privacy-friendly) */
DK.deviceCategory = () => {
  const ua = navigator.userAgent || '';
  const w = window.innerWidth;
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || w < 768) return 'mobile';
  if (/iPad|Tablet/i.test(ua) || (w >= 768 && w < 1024)) return 'tablet';
  if (w >= 1024) return 'desktop';
  return 'unknown';
};

DK.browserInfo = () => {
  const ua = navigator.userAgent || '';
  let name = 'unknown';
  if (ua.includes('Firefox/')) name = 'Firefox';
  else if (ua.includes('Edg/')) name = 'Edge';
  else if (ua.includes('Chrome/')) name = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) name = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) name = 'Opera';
  return { name, language: navigator.language || 'unknown' };
};

/* Confirm dialog */
DK.confirm = (message, title = 'تأیید') => {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'dk-modal-overlay';
    overlay.innerHTML = `
      <div class="dk-modal" role="dialog" aria-modal="true">
        <h3 class="dk-modal-title">${DK.escape(title)}</h3>
        <p class="dk-modal-body">${DK.escape(message)}</p>
        <div class="dk-modal-actions">
          <button class="btn btn-ghost" data-action="cancel">انصراف</button>
          <button class="btn btn-primary" data-action="ok">تأیید</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = (val) => {
      overlay.remove();
      resolve(val);
    };
    overlay.querySelector('[data-action="ok"]').onclick = () => close(true);
    overlay.querySelector('[data-action="cancel"]').onclick = () => close(false);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
  });
};

/* Query string helpers */
DK.query = {
  get(key) {
    return new URLSearchParams(window.location.search).get(key);
  },
  set(params) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v == null || v === '') url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    });
    history.replaceState(null, '', url.toString());
  }
};

window.DK = DK;
