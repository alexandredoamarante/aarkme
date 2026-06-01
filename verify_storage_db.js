
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qibuxwsrviynnasfdmfn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mVerQ6cRiXKDUbvpN5GvBw_Yeg9Sm_E";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
  console.log("Checking Supabase Storage and Database...");

  // 1. Check if bucket exists (public buckets are listable if policy allows)
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.warn("Could not list buckets (expected if not authenticated/no policy):", bucketError.message);
  } else {
    const hasBucket = buckets.some(b => b.name === 'aarkme-media');
    console.log(`Bucket 'aarkme-media' exists: ${hasBucket}`);
  }

  // 2. Check profiles for any avatar URLs
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('username, avatar')
    .not('avatar', 'eq', '')
    .limit(5);

  if (profileError) {
    console.error("Error fetching profiles:", profileError.message);
  } else {
    console.log(`Found ${profiles.length} profiles with avatars.`);
    profiles.forEach(p => {
      console.log(`- @${p.username}: ${p.avatar.slice(0, 50)}...`);
      if (!p.avatar.startsWith(SUPABASE_URL)) {
        console.warn(`  Warning: Avatar URL for @${p.username} does not point to Supabase Storage!`);
      }
    });
  }

  // 3. Check media_items for any cover URLs
  const { data: media, error: mediaError } = await supabase
    .from('media_items')
    .select('kind, slot_index, cover')
    .not('cover', 'eq', '')
    .limit(5);

  if (mediaError) {
    console.error("Error fetching media_items:", mediaError.message);
  } else {
    console.log(`Found ${media.length} media items with covers.`);
    media.forEach(m => {
      console.log(`- ${m.kind}[${m.slot_index}]: ${m.cover.slice(0, 50)}...`);
      if (!m.cover.startsWith(SUPABASE_URL)) {
        console.warn(`  Warning: Cover URL for ${m.kind}[${m.slot_index}] does not point to Supabase Storage!`);
      }
    });
  }
}

verify();
