/* =====================================================
   DARKKNIGHT STUDIO — Permission constants & helpers
   ===================================================== */

window.DK = window.DK || {};
const DK = window.DK;

/**
 * Canonical permission keys used in both UI and (future) RLS checks.
 * Existing roles table uses JSONB; OWNER has {"all": true}.
 */
DK.PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_EDIT: 'users.edit',
  USERS_SUSPEND: 'users.suspend',
  MEMBERSHIPS_VIEW: 'memberships.view',
  MEMBERSHIPS_REVIEW: 'memberships.review',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  ORDERS_VIEW: 'orders.view',
  ORDERS_MANAGE: 'orders.manage',
  PAYMENTS_REVIEW: 'payments.review',
  SUPPORT_VIEW: 'support.view',
  SUPPORT_REPLY: 'support.reply',
  ANALYTICS_VIEW: 'analytics.view',
  REPORTS_EXPORT: 'reports.export',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  ADMINS_MANAGE: 'admins.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_LOGS_VIEW: 'audit_logs.view',
  CONTENT_MANAGE: 'content.manage',
  PROJECTS_MANAGE: 'projects.manage'
};

/**
 * Map legacy coarse permissions (from existing roles) to new keys.
 * Used when role.permissions is the old style object.
 */
DK.mapLegacyPermissions = function (perms) {
  if (!perms || typeof perms !== 'object') return {};
  if (perms.all === true) return { all: true };

  const mapped = { ...perms };

  // Old keys → new keys
  if (perms.projects) {
    mapped[DK.PERMISSIONS.PROJECTS_MANAGE] = true;
    mapped[DK.PERMISSIONS.PRODUCTS_VIEW] = true;
  }
  if (perms.tickets) {
    mapped[DK.PERMISSIONS.SUPPORT_VIEW] = true;
    mapped[DK.PERMISSIONS.SUPPORT_REPLY] = true;
  }
  if (perms.stats) {
    mapped[DK.PERMISSIONS.ANALYTICS_VIEW] = true;
    mapped[DK.PERMISSIONS.DASHBOARD_VIEW] = true;
  }
  if (perms.news || perms.team || perms.links) {
    mapped[DK.PERMISSIONS.CONTENT_MANAGE] = true;
  }
  if (perms.admins) {
    mapped[DK.PERMISSIONS.ADMINS_MANAGE] = true;
  }
  if (perms.settings) {
    mapped[DK.PERMISSIONS.SETTINGS_VIEW] = true;
    mapped[DK.PERMISSIONS.SETTINGS_EDIT] = true;
  }

  return mapped;
};

/**
 * Check permission against an admin profile object (already loaded).
 */
DK.checkPerm = function (adminProfile, permKey) {
  if (!adminProfile?.roles) return false;
  let perms = adminProfile.roles.permissions || {};
  perms = DK.mapLegacyPermissions(perms);
  if (perms.all === true) return true;
  return perms[permKey] === true;
};

/**
 * Hide/show elements based on data-perm attribute.
 * Usage: <button data-perm="products.create">...</button>
 */
DK.applyPermissionUI = async function (root = document) {
  const admin = await DK.getAdminProfile();
  const nodes = root.querySelectorAll('[data-perm]');
  nodes.forEach(el => {
    const key = el.getAttribute('data-perm');
    const allowed = DK.checkPerm(admin, key);
    if (!allowed) {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.disabled = true;
    }
  });
};

window.DK = DK;
