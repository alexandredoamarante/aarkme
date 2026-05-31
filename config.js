/**
 * aarkme Configuration
 */

export const CONFIG = {
  supabase: {
    url: window.AARKME_CONFIG?.supabase?.url || '',
    anonKey: window.AARKME_CONFIG?.supabase?.anonKey || '',
  }
};
