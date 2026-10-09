/* =====================================================
   DARKKNIGHT STUDIO — Privacy-friendly analytics
   ===================================================== */

window.DK = window.DK || {};
const DK = window.DK;

const Analytics = {
  visitorId: null,

  init() {
    this.visitorId = this.getOrCreateVisitorId();
    this.trackPageView();
    this.heartbeat();
    // Heartbeat every 2 minutes while tab is visible
    setInterval(() => {
      if (!document.hidden) this.heartbeat();
    }, 120000);
  },

  getOrCreateVisitorId() {
    try {
      let id = localStorage.getItem('dk_vid');
      if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('dk_vid', id);
      }
      return id;
    } catch {
      return 'anon_' + Date.now();
    }
  },

  async trackPageView() {
    if (!DK.isConfigured || !DK.supabase) return;
    try {
      const user = await DK.getUser();
      const browser = DK.browserInfo();
      await DK.supabase.from('analytics_events').insert({
        visitor_id: this.visitorId,
        user_id: user?.id || null,
        event_type: 'page_view',
        page: location.pathname + location.search,
        referrer: document.referrer ? new URL(document.referrer).hostname : null,
        device_category: DK.deviceCategory(),
        browser_name: browser.name,
        language: browser.language,
        screen_w: window.screen?.width || null,
        screen_h: window.screen?.height || null
      });
    } catch (e) {
      // silent — analytics must never break UX
    }
  },

  async heartbeat() {
    if (!DK.isConfigured || !DK.supabase) return;
    try {
      const user = await DK.getUser();
      const payload = {
        last_seen: new Date().toISOString(),
        page: location.pathname,
        device_category: DK.deviceCategory(),
        visitor_id: this.visitorId
      };
      if (user) {
        await DK.supabase.from('active_sessions').upsert(
          { user_id: user.id, ...payload },
          { onConflict: 'user_id' }
        );
      }
    } catch (e) { /* silent */ }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (DK.isConfigured || window.DK_CONFIG) {
    // slight delay to allow supabase init
    setTimeout(() => Analytics.init(), 800);
  }
});

window.Analytics = Analytics;
