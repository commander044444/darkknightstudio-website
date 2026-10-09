/* =====================================================
   DARKKNIGHT STUDIO — Configuration
   =====================================================
   Keep SUPABASE_URL and SUPABASE_ANON_KEY in sync with
   the existing project. Never put service_role here.
   ===================================================== */

window.DK_CONFIG = {
  // Existing Supabase project — DO NOT create a new one
  SUPABASE_URL: 'https://exaryvtjayuwgyqnioem.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YXJ5dnRqYXl1d2d5cW5pb2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzgxMjUsImV4cCI6MjEwNTE1NDEyNX0.qMKyG9gwUTeNbfXhzbSbTEJMEh4Dy-5M3gZ9vXpmsKs',

  // Base path for GitHub Pages subfolder compatibility
  // When hosted at /darkknightstudio-website/darkknight/ set BASE_PATH = '/darkknightstudio-website/darkknight'
  // When at root of a dedicated repo set BASE_PATH = ''
  BASE_PATH: '/darkknightstudio-website/darkknight',

  // App meta
  SITE_NAME: 'Darkknight Studio',
  SITE_NAME_FA: 'دارک‌نایت استودیو',
  VERSION: '2.0.0',

  // Session / online definition (minutes)
  ONLINE_THRESHOLD_MINUTES: 5,

  // Pagination defaults
  PAGE_SIZE: 12,
  ADMIN_PAGE_SIZE: 25
};
