-- ── reset ──────────────────────────────────────────────────────────────────
drop table if exists votes;
drop table if exists questions cascade;
drop function if exists increment_question_votes(uuid);

-- ── questions ────────────────────────────────────────────────────────────────
create table questions (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  author      text,
  created_at  timestamptz default now()
);

-- ── votes ────────────────────────────────────────────────────────────────────
-- type = 'up' or 'down'; unique constraint = one vote per voter per question.
-- Switching vote = UPDATE the existing row (type changes, no duplicate).
create table votes (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references questions(id) on delete cascade,
  voter_id     text not null,
  type         text not null check (type in ('up', 'down')),  -- ← new
  created_at   timestamptz default now(),
  unique (question_id, voter_id)
);

create index votes_question_id_idx on votes (question_id);

-- ── vote_counts view ─────────────────────────────────────────────────────────
-- Returns net score (upvotes − downvotes) per question.
-- Query this instead of counting raw vote rows in your app.
create or replace view vote_counts as
select
  question_id,
  count(*) filter (where type = 'up')   as upvotes,
  count(*) filter (where type = 'down') as downvotes,
  count(*) filter (where type = 'up') -
  count(*) filter (where type = 'down') as net_votes
from votes
group by question_id;

-- ── full-text search index ───────────────────────────────────────────────────
create index questions_fts_idx on questions using gin (to_tsvector('english', body));

-- ── seed ─────────────────────────────────────────────────────────────────────
insert into questions (body, author, created_at)
select body, author, now() - (n || ' minutes')::interval
from (
  values
    (1,  'How do I deploy to Vercel?', 'Priya'),
    (2,  'What''s the difference between server and client components?', 'Marcus'),
    (3,  'When should I add a database index?', 'Aisha'),
    (4,  'How does Postgres full-text search work?', 'Diego'),
    (5,  'Why did my in-memory data vanish on restart?', 'Lena'),
    (6,  'Should I store a vote count or count vote rows?', 'Sam'),
    (7,  'What is a unique constraint good for?', 'Priya'),
    (8,  'How do I prevent double voting?', 'Noah'),
    (9,  'What''s the difference between SSR and hydration?', 'Aisha'),
    (10, 'How does optimistic UI actually work?', 'Marcus'),
    (11, 'When do I really need pagination?', 'Ravi'),
    (12, 'Offset vs cursor pagination — which one?', 'Lena'),
    (13, 'How do I debounce a search input?', 'Diego'),
    (14, 'Why must secrets stay on the server?', 'Sam'),
    (15, 'What is row-level security in Supabase?', 'Noah'),
    (16, 'How does connection pooling help on Vercel?', 'Priya'),
    (17, 'What is a GIN index and when do I use it?', 'Ravi'),
    (18, 'How do foreign keys protect my data?', 'Aisha'),
    (19, 'When should I move counts into Redis?', 'Marcus'),
    (20, 'How do I run a database migration safely?', 'Lena'),
    (21, 'What does on delete cascade actually do?', 'Diego'),
    (22, 'How do I seed test data quickly?', 'Sam'),
    (23, 'Why is my Vercel function cold starting?', 'Noah'),
    (24, 'How do I scale reads with replicas?', 'Ravi'),
    (25, 'What''s the best way to add auth later?', 'Priya')
) as seed(n, body, author);