create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  consent_version text not null default 'newsletter-v1',
  created_at timestamptz not null default now(),
  constraint newsletter_email_valid check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  constraint newsletter_consent_required check (consent = true)
);
alter table public.newsletter_subscribers enable row level security;
revoke all on table public.newsletter_subscribers from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (email, consent) on table public.newsletter_subscribers to anon, authenticated;
create policy newsletter_insert_with_consent
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (consent = true);
comment on table public.newsletter_subscribers is
  'LOOMY newsletter signups. Browser clients may submit consented email addresses but cannot read, update, or delete subscriber records.';
