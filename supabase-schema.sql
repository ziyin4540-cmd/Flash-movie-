-- Flash Movie cloud schema
-- Run this once in Supabase Dashboard > SQL Editor.

create table if not exists public.contents (
  id bigint primary key,
  type text not null check (type in ('video', 'short', 'post')),
  playlist text default '',
  title text not null,
  storage_path text,
  public_url text,
  file_type text,
  file_name text,
  file_size bigint default 0,
  uploader text not null,
  privacy text default 'public',
  allow_download text default 'yes',
  created_at_ms bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id bigint primary key,
  content_id bigint not null references public.contents(id) on delete cascade,
  user_name text not null,
  body text default '',
  attachment_url text,
  attachment_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.comment_replies (
  id bigint primary key,
  comment_id bigint not null references public.comments(id) on delete cascade,
  user_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a text not null,
  user_b text not null,
  pinned_by text[] not null default '{}',
  deleted_by text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique(user_a, user_b)
);

create table if not exists public.messages (
  id bigint primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender text not null,
  receiver text not null,
  body text default '',
  message_type text default 'text',
  attachment_url text,
  attachment_name text,
  reply_to bigint references public.messages(id) on delete set null,
  edited boolean not null default false,
  pinned boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contents enable row level security;
alter table public.comments enable row level security;
alter table public.comment_replies enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- This project currently uses its own username login, not Supabase Auth.
-- These public policies let the web client work with the publishable key.
-- Tighten them after Supabase Auth is added.
do $$ begin
  create policy "flash contents public access" on public.contents for all to anon, authenticated using (true) with check (true);
  create policy "flash comments public access" on public.comments for all to anon, authenticated using (true) with check (true);
  create policy "flash replies public access" on public.comment_replies for all to anon, authenticated using (true) with check (true);
  create policy "flash conversations public access" on public.conversations for all to anon, authenticated using (true) with check (true);
  create policy "flash messages public access" on public.messages for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Storage policies for the existing flash-media bucket.
do $$ begin
  create policy "flash media public read" on storage.objects for select to anon, authenticated using (bucket_id = 'flash-media');
  create policy "flash media public upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'flash-media');
  create policy "flash media public update" on storage.objects for update to anon, authenticated using (bucket_id = 'flash-media') with check (bucket_id = 'flash-media');
  create policy "flash media public delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'flash-media');
exception when duplicate_object then null; end $$;
