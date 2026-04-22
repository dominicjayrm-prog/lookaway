-- Adds the two columns that back the in-app "Rate BLANKED" prompt.
-- `last_review_prompted_at` drives the 60-day cooldown between Stage A
-- modals; `review_prompt_outcome` makes "accepted" stick across devices
-- so we never re-prompt a user who already gave us their App Store
-- rating (Apple's native sheet is rate-limited to 3/year anyway).
alter table public.profiles
  add column if not exists last_review_prompted_at timestamptz,
  add column if not exists review_prompt_outcome text
    check (review_prompt_outcome in ('accepted', 'dismissed'));

comment on column public.profiles.last_review_prompted_at
  is 'Last time our Stage A review modal was shown. Drives 60-day cooldown.';
comment on column public.profiles.review_prompt_outcome
  is 'Outcome of last Stage A prompt. If accepted, never re-prompt (Apple rate-limits native sheet anyway).';
