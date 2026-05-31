/**
 * aarkme Configuration
 */

export const CONFIG = {
  supabase: {
    url: (typeof window !== 'undefined' && window.AARKME_CONFIG?.SUPABASE_URL) || '',
    anonKey: (typeof window !== 'undefined' && window.AARKME_CONFIG?.SUPABASE_ANON_KEY) || '',
  }
};
