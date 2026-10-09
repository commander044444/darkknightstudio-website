/* Darkknight Studio — Admin panel with robust Supabase init */
const Admin = {
  admin: null,

  init() {
    this.ensureSupabase();
    const form = document.getElementById("admin-login-form");
    if (form) form.addEventListener("submit", (e) => this.handleLogin(e));
  },

  ensureSupabase() {
    try {
      if (typeof window.DK === "undefined") {
        window.DK = {};
      }
      const cfg = window.DK_CONFIG || {};
      if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
        return { ok: false, error: "تنظیمات SUPABASE در config.js یافت نشد." };
      }
      if (typeof supabase === "undefined" || !supabase.createClient) {
        return { ok: false, error: "کتابخانه Supabase از CDN لود نشد. اینترنت یا مسدودکننده تبلیغات را چک کنید." };
      }
      if (!DK.supabase) {
        DK.supabase = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        });
        DK.isConfigured = true;
      }
      return { ok: true };
    } catch (e) {
      console.error(e);
      return { ok: false, error: e.message || "خطا در اتصال Supabase" };
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const errEl = document.getElementById("admin-login-error");
    const btn = document.getElementById("admin-login-btn");
    if (errEl) errEl.textContent = "";

    const email = (form.email.value || "").trim();
    const password = form.password.value || "";
    if (!email || !password) {
      if (errEl) errEl.textContent = "ایمیل و رمز عبور را وارد کنید.";
      return;
    }

    const conn = this.ensureSupabase();
    if (!conn.ok) {
      if (errEl) errEl.textContent = conn.error;
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = "در حال ورود…";
    }

    try {
      const client = DK.supabase;
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: adminRow, error: adminErr } = await client
        .from("admins")
        .select("*, roles(name, permissions)")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (adminErr) throw adminErr;

      if (!adminRow) {
        await client.auth.signOut();
        if (errEl) errEl.textContent = "این حساب دسترسی مدیریت ندارد. باید در جدول admins ثبت شده باشید.";
        return;
      }

      this.admin = adminRow;
      this.showDashboard();
    } catch (err) {
      console.error(err);
      let msg = err.message || "خطا در ورود";
      if (/invalid login|invalid_credentials|Invalid login/i.test(msg)) {
        msg = "ایمیل یا رمز عبور اشتباه است.";
      }
      if (/Failed to fetch|NetworkError|network/i.test(msg)) {
        msg = "خطای شبکه — اتصال اینترنت یا دسترسی به Supabase را بررسی کنید.";
      }
      if (errEl) errEl.textContent = msg;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "ورود به پنل";
      }
    }
  },

  showDashboard() {
    const login = document.getElementById("admin-login-screen");
    const dash = document.getElementById("admin-dashboard");
    if (login) login.style.display = "none";
    if (dash) {
      dash.style.display = "block";
      this.renderShell();
      this.loadDashboard();
    }
  },

  showLogin() {
    const login = document.getElementById("admin-login-screen");
    const dash = document.getElementById("admin-dashboard");
    if (dash) { dash.style.display = "none"; dash.innerHTML = ""; }
    if (login) login.style.display = "flex";
    const form = document.getElementById("admin-login-form");
    if (form) form.reset();
    const errEl = document.getElementById("admin-login-error");
    if (errEl) errEl.textContent = "";
  },

  escape(str) {
    if (str == null) return "";
    const d = document.createElement("div");
    d.textContent = String(str);
    return d.innerHTML;
  },

  renderShell() {
    const isOwner = this.admin.roles && this.admin.roles.name === "OWNER";
    const name = this.admin.display_name || (this.admin.roles && this.admin.roles.name) || "ادمین";
    document.getElementById("admin-dashboard").innerHTML =
      '<div class="dash-layout">' +
      '<aside class="dash-sidebar">' +
      '<div class="dash-brand"><span>⚔</span> پنل مدیریت</div>' +
      '<nav class="dash-nav">' +
      '<a href="#" data-panel="dashboard" class="active">داشبورد</a>' +
      '<a href="#" data-panel="tickets">تیکت‌ها</a>' +
      '<a href="#" data-panel="memberships">درخواست عضویت</a>' +
      '<a href="#" data-panel="projects">پروژه‌ها</a>' +
      '<a href="#" data-panel="products">محصولات</a>' +
      '<a href="#" data-panel="orders">سفارش‌ها</a>' +
      '<a href="#" data-panel="news">اخبار</a>' +
      (isOwner ? '<a href="owner.html">پنل مالک ←</a>' : '') +
      '<a href="index.html">بازگشت به سایت</a>' +
      '<a href="#" id="admin-logout">خروج</a>' +
      '</nav></aside>' +
      '<main class="dash-main">' +
      '<div class="dash-header"><h1 id="panel-title" style="font-size:1.25rem;margin:0">داشبورد</h1>' +
      '<span class="text-muted" style="font-size:.85rem">' + this.escape(name) + '</span></div>' +
      '<div id="panel-dashboard" class="dash-panel active"></div>' +
      '<div id="panel-tickets" class="dash-panel"></div>' +
      '<div id="panel-memberships" class="dash-panel"></div>' +
      '<div id="panel-projects" class="dash-panel"></div>' +
      '<div id="panel-products" class="dash-panel"></div>' +
      '<div id="panel-orders" class="dash-panel"></div>' +
      '<div id="panel-news" class="dash-panel"></div>' +
      '</main></div>';

    document.querySelectorAll(".dash-nav a[data-panel]").forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        this.showPanel(a.dataset.panel);
        document.querySelectorAll(".dash-nav a").forEach((x) => x.classList.remove("active"));
        a.classList.add("active");
      });
    });
    document.getElementById("admin-logout").addEventListener("click", async (ev) => {
      ev.preventDefault();
      try { if (DK.supabase) await DK.supabase.auth.signOut(); } catch (_) {}
      this.admin = null;
      this.showLogin();
    });
  },

  showPanel(name) {
    document.querySelectorAll(".dash-panel").forEach((p) => p.classList.remove("active"));
    const el = document.getElementById("panel-" + name);
    if (el) el.classList.add("active");
    const titles = { dashboard: "داشبورد", tickets: "تیکت‌ها", memberships: "درخواست عضویت", projects: "پروژه‌ها", products: "محصولات", orders: "سفارش‌ها", news: "اخبار" };
    const t = document.getElementById("panel-title");
    if (t) t.textContent = titles[name] || name;
    if (name === "tickets") this.loadTickets();
    if (name === "memberships") this.loadMemberships();
    if (name === "projects") this.loadProjects();
    if (name === "products") this.loadProducts();
    if (name === "orders") this.loadOrders();
    if (name === "news") this.loadNews();
  },

  async loadDashboard() {
    const el = document.getElementById("panel-dashboard");
    if (!el) return;
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const client = DK.supabase;
      const q = async (table, filter) => {
        let query = client.from(table).select("*", { count: "exact", head: true });
        if (filter) Object.entries(filter).forEach(([k, v]) => { query = query.eq(k, v); });
        const { count } = await query;
        return count || 0;
      };
      const counts = await Promise.all([
        q("projects").catch(() => 0),
        q("tickets", { status: "OPEN" }).catch(() => 0),
        q("team_applications", { status: "PENDING" }).catch(() => 0),
        q("products", { is_published: true }).catch(() => 0),
        q("orders").catch(() => 0),
        q("news", { status: "PUBLISHED" }).catch(() => 0),
      ]);
      const labels = ["پروژه‌ها", "تیکت باز", "عضویت جدید", "محصول منتشر", "سفارش‌ها", "اخبار"];
      el.innerHTML = '<div class="dash-stats">' + counts.map((c, i) =>
        '<div class="dash-stat"><div class="dash-stat-value">' + Number(c).toLocaleString("fa-IR") +
        '</div><div class="dash-stat-label">' + labels[i] + '</div></div>'
      ).join("") + '</div>';
    } catch (e) {
      el.innerHTML = '<p class="text-muted">خطا در بارگذاری آمار</p>';
    }
  },

  async loadTickets() {
    const el = document.getElementById("panel-tickets");
    if (!el) return;
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(50);
      if (!data || !data.length) { el.innerHTML = '<div class="empty-state"><p>تیکتی نیست</p></div>'; return; }
      const st = { OPEN: "باز", IN_PROGRESS: "بررسی", WAITING: "منتظر", CLOSED: "بسته" };
      el.innerHTML = '<div style="overflow-x:auto"><table class="dash-table"><thead><tr><th>موضوع</th><th>نام</th><th>وضعیت</th><th></th></tr></thead><tbody>' +
        data.map((t) => "<tr><td>" + this.escape(t.subject) + "</td><td>" + this.escape(t.creator_name) +
          "</td><td>" + (st[t.status] || t.status) + '</td><td><a class="btn btn-ghost btn-sm" href="support.html?token=' +
          encodeURIComponent(t.access_token) + '" target="_blank">مشاهده</a></td></tr>').join("") +
        "</tbody></table></div>";
    } catch (e) {
      el.innerHTML = '<p class="form-error">' + this.escape(e.message) + "</p>";
    }
  },

  async loadMemberships() {
    const el = document.getElementById("panel-memberships");
    if (!el) return;
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from("team_applications").select("*").order("created_at", { ascending: false }).limit(50);
      if (!data || !data.length) { el.innerHTML = '<div class="empty-state"><p>درخواستی نیست</p></div>'; return; }
      el.innerHTML = '<div style="overflow-x:auto"><table class="dash-table"><thead><tr><th>نام</th><th>موبایل</th><th>وضعیت</th><th></th></tr></thead><tbody>' +
        data.map((m) => "<tr><td>" + this.escape(m.name) + '</td><td dir="ltr">' + this.escape(m.mobile || m.contact || "—") +
          "</td><td>" + this.escape(m.status) + '</td><td><button class="btn btn-sm btn-primary" data-accept="' + m.id +
          '">پذیرش</button> <button class="btn btn-sm btn-ghost" data-reject="' + m.id + '">رد</button></td></tr>').join("") +
        "</tbody></table></div>";
      el.querySelectorAll("[data-accept]").forEach((btn) => {
        btn.onclick = async () => {
          await DK.supabase.from("team_applications").update({ status: "ACCEPTED" }).eq("id", btn.dataset.accept);
          this.loadMemberships();
        };
      });
      el.querySelectorAll("[data-reject]").forEach((btn) => {
        btn.onclick = async () => {
          await DK.supabase.from("team_applications").update({ status: "REJECTED" }).eq("id", btn.dataset.reject);
          this.loadMemberships();
        };
      });
    } catch (e) {
      el.innerHTML = '<p class="form-error">' + this.escape(e.message) + "</p>";
    }
  },

  async loadProjects() {
    const el = document.getElementById("panel-projects");
    if (!el) return;
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from("projects").select("id,title,status,version").order("display_order");
      el.innerHTML = !data || !data.length
        ? '<div class="empty-state"><p>پروژه‌ای نیست</p></div>'
        : '<table class="dash-table"><thead><tr><th>عنوان</th><th>وضعیت</th><th>نسخه</th></tr></thead><tbody>' +
          data.map((p) => "<tr><td>" + this.escape(p.title) + "</td><td>" + this.escape(p.status) + "</td><td>" + this.escape(p.version || "") + "</td></tr>").join("") +
          "</tbody></table>";
    } catch (e) {
      el.innerHTML = '<p class="form-error">' + this.escape(e.message) + "</p>";
    }
  },

  async loadProducts() {
    const el = document.getElementById("panel-products");
    if (!el) return;
    el.innerHTML = '<div class="empty-state"><p>محصولات (نیاز به migration 004)</p></div>';
    try {
      const { data, error } = await DK.supabase.from("products").select("id,name,price,is_published").limit(50);
      if (error) throw error;
      if (!data || !data.length) return;
      el.innerHTML = '<table class="dash-table"><thead><tr><th>نام</th><th>قیمت</th><th>منتشر</th></tr></thead><tbody>' +
        data.map((p) => "<tr><td>" + this.escape(p.name) + "</td><td>" + p.price + "</td><td>" + (p.is_published ? "بله" : "خیر") + "</td></tr>").join("") +
        "</tbody></table>";
    } catch (_) {}
  },

  async loadOrders() {
    const el = document.getElementById("panel-orders");
    if (!el) return;
    el.innerHTML = '<div class="empty-state"><p>سفارشی نیست</p></div>';
    try {
      const { data, error } = await DK.supabase.from("orders").select("*").limit(50);
      if (error || !data || !data.length) return;
      el.innerHTML = '<table class="dash-table"><thead><tr><th>شماره</th><th>وضعیت</th><th>مبلغ</th></tr></thead><tbody>' +
        data.map((o) => "<tr><td>" + this.escape(o.order_number) + "</td><td>" + this.escape(o.status) + "</td><td>" + o.total + "</td></tr>").join("") +
        "</tbody></table>";
    } catch (_) {}
  },

  async loadNews() {
    const el = document.getElementById("panel-news");
    if (!el) return;
    el.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      const { data } = await DK.supabase.from("news").select("id,title,status").order("created_at", { ascending: false }).limit(30);
      el.innerHTML = !data || !data.length
        ? '<div class="empty-state"><p>خبری نیست</p></div>'
        : '<table class="dash-table"><thead><tr><th>عنوان</th><th>وضعیت</th></tr></thead><tbody>' +
          data.map((n) => "<tr><td>" + this.escape(n.title) + "</td><td>" + this.escape(n.status) + "</td></tr>").join("") +
          "</tbody></table>";
    } catch (e) {
      el.innerHTML = '<p class="form-error">' + this.escape(e.message) + "</p>";
    }
  }
};

document.addEventListener("DOMContentLoaded", () => Admin.init());
