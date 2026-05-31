-- Run this in the Supabase SQL Editor to create the questions table.
-- (The votes table comes later, when we build upvoting in Phase 4.)

create table if not exists questions (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  author      text,
  created_at  timestamptz default now()
);
