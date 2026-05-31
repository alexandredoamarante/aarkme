/**
 * aarkme Supabase Service
 */

export class SupabaseService {
  constructor(config) {
    this.config = config;
    if (typeof window !== 'undefined' && window.supabase && config.url && config.anonKey) {
      this.client = window.supabase.createClient(config.url, config.anonKey);
    } else {
      this.client = null;
    }
  }

  async getProfile(username) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*, media_items(*)')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  }

  async getCurrentUser() {
    const { data: { user } } = await this.client.auth.getUser();
    return user;
  }

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async deleteMediaItem(profileId, kind, slotIndex) {
    if (!this.client) return;
    const { error } = await this.client
      .from('media_items')
      .delete()
      .match({ profile_id: profileId, kind, slot_index: slotIndex });
    if (error) throw error;
  }

  async saveProfile(profileData) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        ...profileData,
        owner_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async saveMediaItem(profileId, itemData) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.client
      .from('media_items')
      .upsert({
        ...itemData,
        profile_id: profileId,
        owner_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async uploadImage(bucket, path, file) {
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
