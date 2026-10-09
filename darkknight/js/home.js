/* Darkknight Studio — Homepage loaders (direct REST, no CDN client dependency) */
(function () {
  var URL = "https://exaryvtjayuwgyqnioem.supabase.co";
  var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YXJ5dnRqYXl1d2d5cW5pb2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzgxMjUsImV4cCI6MjEwNTE1NDEyNX0.qMKyG9gwUTeNbfXhzbSbTEJMEh4Dy-5M3gZ9vXpmsKs";

  function headers() {
    return {
      "apikey": KEY,
      "Authorization": "Bearer " + KEY,
      "Content-Type": "application/json"
    };
  }

  async function get(path) {
    var res = await fetch(URL + path, { headers: headers() });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function empty(el, text) {
    if (!el) return;
    el.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">⚔</div><p>' +
      esc(text || "موردی نیست") +
      "</p></div>";
  }

  function price(n) {
    if (n == null || isNaN(n)) return "—";
    return Number(n).toLocaleString("fa-IR") + " تومان";
  }

  var Home = {
    init: function () {
      var y = document.getElementById("year");
      if (y) y.textContent = new Date().getFullYear();
      this.bindMenu();
      this.bindScroll();

      // Never leave spinners forever — each loader handles its own grid
      Promise.allSettled([
        this.loadStats(),
        this.loadFeaturedProducts(),
        this.loadProjects(),
        this.loadCategories(),
        this.loadTeam(),
        this.loadSocialLinks()
      ]);
    },

    bindMenu: function () {
      var toggle = document.getElementById("menu-toggle");
      var nav = document.getElementById("nav");
      if (!toggle || !nav) return;
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.classList.toggle("open", open);
        document.body.style.overflow = open ? "hidden" : "";
      });
    },

    bindScroll: function () {
      var header = document.getElementById("header");
      if (!header) return;
      window.addEventListener(
        "scroll",
        function () {
          header.classList.toggle("scrolled", window.scrollY > 30);
        },
        { passive: true }
      );
    },

    loadStats: async function () {
      try {
        var stats = [];
        try {
          stats = await get("/rest/v1/statistics?select=key,value");
        } catch (e) {}
        var map = {};
        (stats || []).forEach(function (s) {
          map[s.key] = s.value;
        });

        var projects = 0,
          products = 0,
          members = 0;
        try {
          var p = await get("/rest/v1/projects?select=id&status=neq.ARCHIVED");
          projects = (p && p.length) || 0;
        } catch (e) {
          projects = map.projects || 0;
        }
        try {
          var pr = await get("/rest/v1/products?select=id&is_published=eq.true");
          products = (pr && pr.length) || 0;
        } catch (e) {
          products = 0;
        }
        try {
          var m = await get("/rest/v1/team_members?select=id&is_visible=eq.true");
          members = (m && m.length) || 0;
        } catch (e) {
          members = map.members || 0;
        }

        function set(key, val) {
          var el = document.querySelector('[data-stat="' + key + '"]');
          if (el) el.textContent = Number(val || 0).toLocaleString("fa-IR");
        }
        set("projects", projects);
        set("products", products);
        set("members", members);
        set("views", map.total_views || 0);
      } catch (e) {
        console.warn("stats", e);
        ["projects", "products", "members", "views"].forEach(function (k) {
          var el = document.querySelector('[data-stat="' + k + '"]');
          if (el && el.textContent === "—") el.textContent = "0";
        });
      }
    },

    loadFeaturedProducts: async function () {
      var grid = document.getElementById("featured-products-grid");
      if (!grid) return;
      try {
        var data = await get(
          "/rest/v1/products?select=id,name,slug,short_description,price,sale_price,cover_url&is_published=eq.true&order=published_at.desc.nullslast&limit=6"
        );
        if (!data || !data.length) {
          empty(grid, "هنوز محصولی منتشر نشده است");
          return;
        }
        grid.innerHTML = data
          .map(function (p) {
            var img = p.cover_url
              ? '<img class="product-card-img" src="' +
                esc(p.cover_url) +
                '" alt="' +
                esc(p.name) +
                '" loading="lazy">'
              : '<div class="product-card-img" style="display:flex;align-items:center;justify-content:center;opacity:.4;font-size:2rem">⚔</div>';
            var pr =
              p.sale_price != null
                ? "<span>" +
                  price(p.sale_price) +
                  '</span><span class="price-old">' +
                  price(p.price) +
                  "</span>"
                : "<span>" + price(p.price) + "</span>";
            return (
              '<a href="product.html?slug=' +
              encodeURIComponent(p.slug) +
              '" class="card product-card">' +
              img +
              '<div class="product-card-body"><h3 class="card-title">' +
              esc(p.name) +
              '</h3><p class="text-muted" style="font-size:.85rem;flex:1">' +
              esc(p.short_description || "") +
              '</p><div class="product-price">' +
              pr +
              "</div></div></a>"
            );
          })
          .join("");
      } catch (e) {
        empty(grid, "فروشگاه در حال آماده‌سازی است");
      }
    },

    loadProjects: async function () {
      var grid = document.getElementById("projects-grid");
      if (!grid) return;
      try {
        var data = await get(
          "/rest/v1/projects?select=id,title,description,logo_url,banner_url,status,version&status=neq.ARCHIVED&order=display_order.asc&limit=6"
        );
        if (!data || !data.length) {
          empty(grid, "پروژه‌ای ثبت نشده — از پنل مدیریت اضافه کنید");
          return;
        }
        var statusLabel = {
          ONLINE: "آنلاین",
          OFFLINE: "آفلاین",
          IN_DEVELOPMENT: "در حال توسعه"
        };
        grid.innerHTML = data
          .map(function (p) {
            var img =
              p.banner_url || p.logo_url
                ? '<img class="project-card-img" src="' +
                  esc(p.banner_url || p.logo_url) +
                  '" alt="" loading="lazy">'
                : '<div class="project-card-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;opacity:.4">⚔</div>';
            return (
              '<a href="project.html?id=' +
              p.id +
              '" class="card project-card">' +
              img +
              '<div class="project-card-body"><div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center"><h3 class="card-title">' +
              esc(p.title) +
              '</h3><span class="badge">' +
              esc(statusLabel[p.status] || p.status) +
              '</span></div><p class="text-muted" style="font-size:.85rem">' +
              esc((p.description || "").slice(0, 120)) +
              "</p></div></a>"
            );
          })
          .join("");
      } catch (e) {
        empty(grid, "خطا در بارگذاری پروژه‌ها");
      }
    },

    loadCategories: async function () {
      var grid = document.getElementById("categories-grid");
      if (!grid) return;
      try {
        var data = await get(
          "/rest/v1/product_categories?select=name,slug,icon&is_active=eq.true&order=display_order"
        );
        if (!data || !data.length) {
          empty(grid, "دسته‌بندی‌ها پس از افزودن محصول نمایش داده می‌شوند");
          return;
        }
        grid.innerHTML = data
          .map(function (c) {
            return (
              '<a href="shop.html?cat=' +
              encodeURIComponent(c.slug) +
              '" class="card" style="text-align:center"><div style="font-size:1.75rem;margin-bottom:.5rem">' +
              (c.icon || "📦") +
              '</div><h3 style="font-size:1rem">' +
              esc(c.name) +
              "</h3></a>"
            );
          })
          .join("");
      } catch (e) {
        empty(grid, "دسته‌بندی در دسترس نیست");
      }
    },

    loadTeam: async function () {
      var grid = document.getElementById("team-grid");
      if (!grid) return;
      try {
        var data = await get(
          "/rest/v1/team_members?select=name,role,bio,avatar_url&is_visible=eq.true&order=display_order&limit=12"
        );
        if (!data || !data.length) {
          empty(grid, "اعضای تیم به‌زودی معرفی می‌شوند");
          return;
        }
        grid.innerHTML = data
          .map(function (m) {
            var av = m.avatar_url
              ? '<img src="' +
                esc(m.avatar_url) +
                '" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto .75rem" loading="lazy">'
              : '<div style="width:72px;height:72px;border-radius:50%;background:rgba(200,200,216,.15);margin:0 auto .75rem;display:flex;align-items:center;justify-content:center;font-weight:700">' +
                esc((m.name || "?")[0]) +
                "</div>";
            return (
              '<div class="card" style="text-align:center">' +
              av +
              '<h3 style="font-size:1.05rem">' +
              esc(m.name) +
              '</h3><p class="text-muted" style="font-size:.85rem">' +
              esc(m.role || "") +
              "</p></div>"
            );
          })
          .join("");
      } catch (e) {
        empty(grid, "خطا در بارگذاری تیم");
        console.warn(e);
      }
    },

    loadSocialLinks: async function () {
      var el = document.getElementById("social-links");
      if (!el) return;
      try {
        var data = await get(
          "/rest/v1/official_links?select=title,url,icon&is_visible=eq.true&order=display_order"
        );
        if (!data || !data.length) return;
        el.innerHTML = data
          .map(function (l) {
            return (
              '<a href="' +
              esc(l.url) +
              '" target="_blank" rel="noopener" title="' +
              esc(l.title) +
              '">' +
              (l.icon || "🔗") +
              "</a>"
            );
          })
          .join("");
      } catch (e) {}
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      Home.init();
    });
  } else {
    Home.init();
  }
})();
