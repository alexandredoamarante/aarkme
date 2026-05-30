// aarkme future integration configuration example
// Copy this file to config.js when you are ready to connect a backend.
// The current static app does not import or require this file.

window.AARKME_CONFIG = {
  appName: 'aarkme',
  environment: 'development',
  hosting: {
    provider: 'Cloudflare Pages',
    productionUrl: 'https://your-domain.example',
  },
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
    authProvider: 'email_password',
    profilesTable: 'profiles',
    mediaItemsTable: 'media_items',
    storageBucket: 'aarkme-media',
  },
  routes: {
    profilePattern: '/@username',
    queryFallback: '?u=username',
  },
};
