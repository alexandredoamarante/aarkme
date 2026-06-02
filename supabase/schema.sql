-- aarkme Supabase schema
-- Prepared for profiles, media items, and storage with RLS.

-- Extensions
create extension if not exists pgcrypto;

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null default '',
  bio text not null default '',
  avatar text,
  theme jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9._-]{1,30}$' and username ~ '[a-z0-9]')
);

-- Media items table
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('movies', 'albums', 'books', 'games')),
  slot_index integer not null check (slot_index >= 0 and slot_index <= 9),
  title text not null default '',
  creator text not null default '',
  year text not null default '',
  rating text not null default '',
  tag text not null default '',
  note text not null default '',
  cover text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, kind, slot_index)
);

-- Indexes for performance
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_media_items_profile_id on public.media_items(profile_id);
create index if not exists idx_media_items_owner_id on public.media_items(owner_id);

-- Updated_at trigger function
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers
drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_media_items_updated_at on public.media_items;
create trigger touch_media_items_updated_at
before update on public.media_items
for each row execute function public.touch_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.media_items enable row level security;

create policy "public can read public profiles"
on public.profiles for select
using (is_public = true or auth.uid() = owner_id);

create policy "owners manage their profiles"
on public.profiles for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "public can read media for public profiles"
on public.media_items for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = media_items.profile_id
      and (p.is_public = true or p.owner_id = auth.uid())
  )
);

create policy "owners manage media"
on public.media_items for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = media_items.profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = media_items.profile_id
      and p.owner_id = auth.uid()
  )
);

-- Storage bucket for aarkme-media
-- Note: Buckets are usually created via the Supabase Dashboard or API,
-- but we include the policy here for documentation and readiness.

-- Policy for storage: owners can upload/delete their own media
-- storage.objects policies:
-- 1. Owners can manage their own folder (named after their profile_id or owner_id)
-- 2. Public can read if profile is public.

/*
create policy "Owners can upload media"
on storage.objects for insert
with check (
  bucket_id = 'aarkme-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owners can update/delete media"
on storage.objects for all
using (
  bucket_id = 'aarkme-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public can view media"
on storage.objects for select
using ( bucket_id = 'aarkme-media' );
*/
