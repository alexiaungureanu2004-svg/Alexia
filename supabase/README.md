# LOOMY Supabase
Project: loomy (Free), eu-central-1 (Frankfurt).
Dashboard: https://supabase.com/dashboard/project/rijculizyqoazgshlgel

The static site uses the Supabase REST Data API through `supabase-newsletter.js`.
Only the publishable key is included in the browser. No service-role key is needed.
Root files and `dist/` are kept in sync because both are deployment entry points.

The newsletter form stores a normalized email, explicit consent, consent version,
and database timestamp in `public.newsletter_subscribers`. Repeated emails are
not duplicated. Errors leave the form available for retry.
This stores signups; email campaign delivery is not configured.

RLS is enabled. Browser roles may insert only email and consent, with consent=true.
They cannot list, update, or delete subscribers or override the consent timestamp.
Manage subscribers in the Supabase dashboard.
Measurements, cart data, and try-on photos are not sent to this database.

The schema is recorded in `supabase/schema.sql` and was applied through
the Supabase migration `create_newsletter_subscribers`.
