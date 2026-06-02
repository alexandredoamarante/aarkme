/**
 * aarkme Supabase Service
 */

export class SupabaseService {
  constructor(config) {
    this.config = config;
    this._client = null;
    this.timeout = 10000; // 10s default timeout
  }

  get client() {
    if (this._client) return this._client;
    if (typeof window !== 'undefined' && window.supabase && this.config.url && this.config.anonKey) {
      this._client = window.supabase.createClient(this.config.url, this.config.anonKey);
    }
    return this._client;
  }

  async withTimeout(promise) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await promise;
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  async getProfile(username) {
    if (!this.client) return null;
    try {
      const { data, error } = await this.withTimeout(
        this.client
          .from('profiles')
          .select('*')
          .eq('username', username)
          .eq('is_public', true)
          .maybeSingle()
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getProfile failed:', error);
      return null;
    }
  }

  async getProfileByOwnerId(ownerId) {
    if (!this.client) return null;
    try {
      const { data, error } = await this.withTimeout(
        this.client
          .from('profiles')
          .select('*')
          .eq('owner_id', ownerId)
          .maybeSingle()
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getProfileByOwnerId failed:', error);
      return null;
    }
  }

  async getMediaItems(profileId) {
    if (!this.client) return [];
    try {
      const { data, error } = await this.withTimeout(
        this.client
          .from('media_items')
          .select('*')
          .eq('profile_id', profileId)
          .order('kind', { ascending: true })
          .order('slot_index', { ascending: true })
      );

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getMediaItems failed:', error);
      return [];
    }
  }

  async getCurrentUser() {
    if (!this.client) return null;
    try {
      const { data: { user } } = await this.client.auth.getUser();
      return user;
    } catch (error) {
      return null;
    }
  }

  async signInWithOtp(email) {
    if (!this.client) throw new Error('Supabase not configured. Check your supabase-config.js file.');
    const { data, error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async deleteMediaItem(profileId, kind, slotIndex) {
    if (!this.client) return;
    const user = await this.getCurrentUser();
    if (!user) return;

    try {
      const { error } = await this.client
        .from('media_items')
        .delete()
        .match({
          profile_id: profileId,
          owner_id: user.id,
          kind,
          slot_index: slotIndex,
        });
      if (error) throw error;
    } catch (error) {
      console.error('deleteMediaItem failed:', error);
      throw error;
    }
  }

  async saveProfile(profileData) {
    if (!this.client) throw new Error('Supabase not configured');
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Remove id from payload if present, we rely on owner_id for conflict resolution
    const { id, ...cleanData } = profileData;

    try {
      const { data, error } = await this.withTimeout(
        this.client
          .from('profiles')
          .upsert({
            is_public: true,
            ...cleanData,
            owner_id: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'owner_id' })
          .select()
          .single()
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('saveProfile failed:', error);
      throw error;
    }
  }

  async saveMediaItem(profileId, itemData) {
    if (!this.client) throw new Error('Supabase not configured');
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Remove id from payload if present, we rely on composite key for conflict resolution
    const { id, ...cleanData } = itemData;

    try {
      const { data, error } = await this.withTimeout(
        this.client
          .from('media_items')
          .upsert({
            ...cleanData,
            profile_id: profileId,
            owner_id: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'profile_id,kind,slot_index' })
          .select()
          .single()
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('saveMediaItem failed:', error);
      throw error;
    }
  }

  async uploadImage(bucket, path, file) {
    if (!this.client) throw new Error('Supabase not configured');
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = this.client.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('uploadImage failed:', error);
      throw error;
    }
  }
}
