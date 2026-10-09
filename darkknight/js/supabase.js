/* =====================================================
   DARKKNIGHT STUDIO — Supabase Client (v2)
   Compatible with existing Auth users & sessions
   ===================================================== */

window.DK = window.DK || {};
const DK = window.DK;

DK.supabase = null;
DK.isConfigured = false;
DK._sessionCache = null;

/**
 * Initialize Supabase client from DK_CONFIG
 */
DK.initSupabase = function () {
  const cfg = window.DK_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn('[DK] Supabase credentials missing in DK_CONFIG');
    DK.isConfigured = false;
    return null;
  }

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[DK] @supabase/supabase-js not loaded from CDN');
    return null;
  }

  DK.supabase = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    },
    realtime: {
      params: { eventsPerSecond: 8 }
    }
  });

  DK.isConfigured = true;

  // Keep session cache fresh
  DK.supabase.auth.onAuthStateChange((event, session) => {
    DK._sessionCache = session;
    window.dispatchEvent(new CustomEvent('dk:auth-change', { detail: { event, session } }));
  });

  return DK.supabase;
};

/* ---------- Auth helpers (preserve existing users) ---------- */

DK.getSession = async function () {
  if (!DK.supabase) return null;
  if (DK._sessionCache) return DK._sessionCache;
  const { data: { session } } = await DK.supabase.auth.getSession();
  DK._sessionCache = session;
  return session;
};

DK.getUser = async function () {
  const session = await DK.getSession();
  return session?.user || null;
};

DK.signIn = async function (email, password) {
  if (!DK.supabase) throw new Error('Supabase not configured');
  const { data, error } = await DK.supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  DK._sessionCache = data.session;
  return data;
};

DK.signUp = async function (email, password, meta = {}) {
  if (!DK.supabase) throw new Error('Supabase not configured');
  const { data, error } = await DK.supabase.auth.signUp({
    email,
    password,
    options: { data: meta }
  });
  if (error) throw error;
  return data;
};

DK.signOut = async function () {
  if (!DK.supabase) return;
  await DK.supabase.auth.signOut();
  DK._sessionCache = null;
};

DK.resetPassword = async function (email) {
  if (!DK.supabase) throw new Error('Supabase not configured');
  const redirectTo = window.location.origin + (window.DK_CONFIG?.BASE_PATH || '') + '/login.html';
  const { data, error } = await DK.supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return data;
};

DK.updatePassword = async function (newPassword) {
  if (!DK.supabase) throw new Error('Supabase not configured');
  const { data, error } = await DK.supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
};

/* ---------- Role / permission helpers ---------- */

DK.getProfile = async function () {
  if (!DK.supabase) return null;
  const user = await DK.getUser();
  if (!user) return null;

  const { data, error } = await DK.supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[DK] getProfile:', error.message);
    return null;
  }
  return data;
};

DK.getAdminProfile = async function () {
  if (!DK.supabase) return null;
  const user = await DK.getUser();
  if (!user) return null;

  const { data, error } = await DK.supabase
    .from('admins')
    .select('*, roles(name, permissions)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.warn('[DK] getAdminProfile:', error.message);
    return null;
  }
  return data;
};

/**
 * Check if current user has a specific permission string.
 * OWNER with {"all": true} always passes.
 */
DK.hasPermission = async function (perm) {
  const admin = await DK.getAdminProfile();
  if (!admin || !admin.roles) return false;
  const perms = admin.roles.permissions || {};
  if (perms.all === true) return true;
  if (perms[perm] === true) return true;
  // Support nested or list-style permissions if later migrated
  if (Array.isArray(perms.list) && perms.list.includes(perm)) return true;
  return false;
};

DK.isOwner = async function () {
  const admin = await DK.getAdminProfile();
  return admin?.roles?.name === 'OWNER';
};

DK.isAdmin = async function () {
  const admin = await DK.getAdminProfile();
  return !!admin;
};

/* ---------- Safe DB helpers ---------- */

DK.db = {
  async select(table, options = {}) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    let q = DK.supabase.from(table).select(options.select || '*');
    if (options.eq) {
      for (const [k, v] of Object.entries(options.eq)) q = q.eq(k, v);
    }
    if (options.neq) {
      for (const [k, v] of Object.entries(options.neq)) q = q.neq(k, v);
    }
    if (options.in) {
      for (const [k, v] of Object.entries(options.in)) q = q.in(k, v);
    }
    if (options.ilike) {
      for (const [k, v] of Object.entries(options.ilike)) q = q.ilike(k, v);
    }
    if (options.order) {
      const orders = Array.isArray(options.order) ? options.order : [options.order];
      orders.forEach(o => {
        q = q.order(o.column, { ascending: o.asc !== false, nullsFirst: o.nullsFirst });
      });
    }
    if (options.limit) q = q.limit(options.limit);
    if (options.range) q = q.range(options.range[0], options.range[1]);
    if (options.single) q = q.maybeSingle();
    return q;
  },

  async insert(table, row, options = {}) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    let q = DK.supabase.from(table).insert(row);
    if (options.select !== false) q = q.select(options.select || '*');
    if (options.single) q = q.maybeSingle();
    return q;
  },

  async update(table, match, updates, options = {}) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    let q = DK.supabase.from(table).update(updates);
    if (typeof match === 'object') {
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    } else {
      q = q.eq('id', match);
    }
    if (options.select !== false) q = q.select(options.select || '*');
    if (options.single) q = q.maybeSingle();
    return q;
  },

  async delete(table, match) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    let q = DK.supabase.from(table).delete();
    if (typeof match === 'object') {
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    } else {
      q = q.eq('id', match);
    }
    return q;
  },

  async rpc(fn, params = {}) {
    if (!DK.supabase) return { data: null, error: new Error('Not configured') };
    return DK.supabase.rpc(fn, params);
  },

  async count(table, options = {}) {
    if (!DK.supabase) return { count: 0, error: new Error('Not configured') };
    let q = DK.supabase.from(table).select('*', { count: 'exact', head: true });
    if (options.eq) {
      for (const [k, v] of Object.entries(options.eq)) q = q.eq(k, v);
    }
    const { count, error } = await q;
    return { count: count || 0, error };
  }
};

/* ---------- Audit helper ---------- */

DK.audit = async function (action, targetType, targetId, details = {}) {
  try {
    const user = await DK.getUser();
    await DK.db.insert('activity_logs', {
      actor_id: user?.id || null,
      action,
      entity_type: targetType,
      entity_id: targetId,
      details
    }, { select: false });
  } catch (e) {
    console.warn('[DK] audit log failed:', e.message);
  }
};

// Auto-init after DOM ready (config must be loaded first)
document.addEventListener('DOMContentLoaded', () => {
  if (!DK.supabase) DK.initSupabase();
});

window.DK = DK;
