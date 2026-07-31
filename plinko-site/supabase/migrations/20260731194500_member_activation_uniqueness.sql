-- A member has one stable referral link. This is the database concurrency boundary
-- for server-side activation: repeated tabs or retries cannot mint extra links.
alter table public.referral_links
  add constraint referral_links_owner_user_id_key unique (owner_user_id);
