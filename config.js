/**
 * aarkme Configuration
 */

const isBrowser = typeof window !== 'undefined';

export const CONFIG = {
  supabase: {
    get url() {
      if (!isBrowser) return '';
      const raw = window.AARKME_CONFIG?.SUPABASE_URL || window.AARKME_CONFIG?.supabase?.url || '';
      return raw.trim().replace(/\/$/, '');
    },
    get anonKey() {
      if (!isBrowser) return '';
      const raw = window.AARKME_CONFIG?.SUPABASE_ANON_KEY || window.AARKME_CONFIG?.supabase?.anonKey || '';
      return raw.trim();
    }
  }
};

// Diagnostic warning
if (isBrowser) {
  setTimeout(() => {
    if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
      console.warn('aarkme: Supabase configuration is missing or incomplete. Check supabase-config.js.');
    }
  }, 100);
}
