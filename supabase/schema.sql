-- aarkme future Supabase schema draft
-- This schema is not required by the current static-only app.
-- It is prepared for future email/password auth, public profiles, and media storage.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  bio text not null default '',
  avatar_path text,
  theme jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_][a-zA-Z0-9_.-]{1,28}$')
);

create type public.media_kind as enum ('movies', 'albums', 'books', 'games');

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind public.media_kind not null,
  slot_index integer not null check (slot_index >= 0 and slot_index <= 9),
  title text not null default '',
  creator text not null default '',
  year text not null default '',
  rating text not null default '',
  tag text not null default '',
  note text not null default '',
  cover_path text,
  cover_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, kind, slot_index)
);

create table if not exists public.storage_references (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  media_item_id uuid references public.media_items(id) on delete cascade,
  bucket text not null default 'aarkme-media',
  path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_media_items_updated_at on public.media_items;
create trigger touch_media_items_updated_at
before update on public.media_items
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.media_items enable row level security;
alter table public.storage_references enable row level security;

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
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owners manage storage references"
on public.storage_references for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Future storage bucket idea:
-- insert into storage.buckets (id, name, public)
-- values ('aarkme-media', 'aarkme-media', true)
-- on conflict (id) do nothing;
