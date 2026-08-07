-- Manual listing no longer collects a description; quick listing still
-- fills it with the pasted ad text. Column stays, just no longer required.
alter table public.vehicles alter column description drop not null;
