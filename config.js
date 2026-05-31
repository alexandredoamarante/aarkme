/**
 * aarkme Configuration
 */

export const CONFIG = {
  supabase: {
    url: (typeof window !== 'undefined' && window.AARKME_CONFIG?.supabase?.url) || '',
    anonKey: (typeof window !== 'undefined' && window.AARKME_CONFIG?.supabase?.anonKey) || '',
  }
};
