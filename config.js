/**
 * aarkme Configuration
 */

const isBrowser = typeof window !== 'undefined';

export const CONFIG = {
  supabase: {
    url: isBrowser ? (window.AARKME_CONFIG?.SUPABASE_URL || window.AARKME_CONFIG?.supabase?.url || '') : '',
    anonKey: isBrowser ? (window.AARKME_CONFIG?.SUPABASE_ANON_KEY || window.AARKME_CONFIG?.supabase?.anonKey || '') : '',
  }
};

if (isBrowser && (!CONFIG.supabase.url || !CONFIG.supabase.anonKey)) {
  console.warn('aarkme: Supabase configuration is missing or incomplete. Check supabase-config.js.');
}
