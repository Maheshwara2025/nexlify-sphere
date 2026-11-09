-- NS Magnet News: additive feature; leaves news_articles, shorts and card-maker untouched.
create table if not exists public.ns_magnet_articles (
  id uuid primary key default gen_random_uuid(),
  raw_input text not null default '',
  headline text not null,
  points jsonb not null,
  body text not null,
  ending_line text not null default 'మరిన్ని వార్తల కోసం NS NEWS ను అనుసరించండి.',
  image_url text,
  theme_key text not null default 'crimson',
  location_town text not null default 'తెలంగాణ',
  category text not null default 'స్థానిక వార్తలు',
  slug text not null unique,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint ns_magnet_points_six check (jsonb_typeof(points)='array' and jsonb_array_length(points)=6),
  constraint ns_magnet_published_content check (
    status <> 'published' or (
      length(trim(headline))>0
      and length(trim(body))>0
      and nullif(trim(image_url),'') is not null
      and published_at is not null
    )
  )
);
create index if not exists ns_magnet_pub_idx
  on public.ns_magnet_articles (published_at desc)
  where status='published';
alter table public.ns_magnet_articles enable row level security;
revoke all on public.ns_magnet_articles from anon, authenticated;
grant select on public.ns_magnet_articles to anon;
grant select, insert, update, delete on public.ns_magnet_articles to authenticated;
create policy "ns_magnet_published_read" on public.ns_magnet_articles
  for select to anon, authenticated using (status='published');
create policy "ns_magnet_admin_read" on public.ns_magnet_articles
  for select to authenticated using (
    coalesce((select (contractor_access_status()->>'is_admin')::boolean),false)
  );
create policy "ns_magnet_admin_insert" on public.ns_magnet_articles
  for insert to authenticated with check (
    coalesce((select (contractor_access_status()->>'is_admin')::boolean),false)
  );
create policy "ns_magnet_admin_update" on public.ns_magnet_articles
  for update to authenticated
  using (coalesce((select (contractor_access_status()->>'is_admin')::boolean),false))
  with check (coalesce((select (contractor_access_status()->>'is_admin')::boolean),false));
create policy "ns_magnet_admin_delete" on public.ns_magnet_articles
  for delete to authenticated using (
    coalesce((select (contractor_access_status()->>'is_admin')::boolean),false)
  );
