-- Run this in the Supabase SQL Editor. It's idempotent — safe to re-run.

-- questions table
create table if not exists questions (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  author      text,
  votes       int not null default 0,
  created_at  timestamptz default now()
);

-- If the table already existed from an earlier run, add the votes column.
alter table questions add column if not exists votes int not null default 0;

-- Atomic increment: `votes = votes + 1` in a single statement, so concurrent
-- votes can't clobber each other the way a read-then-write would. Returns the
-- new count.
--
-- NOTE: this stores only a number. It can't answer "has THIS person voted?"
-- and can't stop someone clicking 50 times. That limitation is what drives us
-- to a separate votes table (one row per vote + a unique constraint) next.
create or replace function increment_question_votes(q_id uuid)
returns int
language sql
as $$
  update questions set votes = votes + 1 where id = q_id returning votes;
$$;
