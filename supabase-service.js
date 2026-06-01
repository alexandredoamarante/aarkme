/**
 * aarkme Supabase Service
 */

export class SupabaseService {
  constructor(config) {
    this.config = config;
    this._client = null;
  }

  get client() {
    if (this._client) return this._client;
    if (typeof window !== 'undefined' && window.supabase && this.config.url && this.config.anonKey) {
      this._client = window.supabase.createClient(this.config.url, this.config.anonKey);
    }
    return this._client;
  }

  async getProfile(username) {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*, media_items(*)')
        .eq('username', username)
        .eq('is_public', true)
        .maybeSingle();

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
      const { data, error } = await this.client
        .from('profiles')
        .select('*, media_items(*)')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('getProfileByOwnerId failed:', error);
      return null;
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

  async signIn(email, password) {
    if (!this.client) throw new Error('Supabase not configured');
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signInWithOtp(email) {
    if (!this.client) throw new Error('Supabase not configured');
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
    try {
      const { error } = await this.client
        .from('media_items')
        .delete()
        .match({ profile_id: profileId, kind, slot_index: slotIndex });
      if (error) throw error;
    } catch (error) {
      console.error('deleteMediaItem failed:', error);
    }
  }

  async saveProfile(profileData) {
    if (!this.client) throw new Error('Supabase not configured');
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        is_public: true, // Default to true as per requirements
        ...profileData,
        owner_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'owner_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async saveMediaItem(profileId, itemData) {
    if (!this.client) throw new Error('Supabase not configured');
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.client
      .from('media_items')
      .upsert({
        ...itemData,
        profile_id: profileId,
        owner_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'profile_id,kind,slot_index' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async uploadImage(bucket, path, file) {
    if (!this.client) throw new Error('Supabase not configured');
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = this.client.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  }
}
