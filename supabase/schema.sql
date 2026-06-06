-- ── reset ──────────────────────────────────────────────────────────────────
drop table if exists poll_votes cascade;
drop table if exists polls cascade;
drop table if exists votes cascade;
drop table if exists comments cascade;
drop table if exists questions cascade;
drop function if exists increment_question_votes(uuid);
drop function if exists get_questions_with_votes(int, int);
drop function if exists search_questions_with_votes(text, int);
drop view if exists vote_counts;

-- ── questions ────────────────────────────────────────────────────────────────
create table questions (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  author      text,
  pinned      boolean default false,
  created_at  timestamptz default now()
);

-- ── votes ────────────────────────────────────────────────────────────────────
-- No unique constraint — every click inserts a new row so counts grow freely.
create table votes (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references questions(id) on delete cascade,
  voter_id     text not null,
  type         text not null check (type in ('up', 'down')),
  created_at   timestamptz default now()
);

create index votes_question_id_idx on votes (question_id);

-- ── polls ─────────────────────────────────────────────────────────────────────
create table polls (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references questions(id) on delete cascade,
  options      text[] not null,
  created_at   timestamptz default now()
);

-- ── poll_votes ────────────────────────────────────────────────────────────────
-- unique constraint allows switching but not double voting
create table poll_votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references polls(id) on delete cascade,
  voter_id    text not null,
  option_idx  int not null,
  created_at  timestamptz default now(),
  unique (poll_id, voter_id)
);

create index poll_votes_poll_id_idx on poll_votes (poll_id);

-- ── rpc: paginated questions with votes + pin + poll ─────────────────────────
create or replace function get_questions_with_votes(p_offset int, p_limit int)
returns table (
  id           uuid,
  body         text,
  author       text,
  created_at   timestamptz,
  net_votes    bigint,
  pinned       boolean,
  poll_id      uuid,
  poll_options text[]
) as $$
  select
    q.id,
    q.body,
    q.author,
    q.created_at,
    coalesce(
      sum(case when v.type = 'up' then 1 when v.type = 'down' then -1 else 0 end),
      0
    ) as net_votes,
    q.pinned,
    p.id as poll_id,
    p.options as poll_options
  from questions q
  left join votes v on v.question_id = q.id
  left join polls p on p.question_id = q.id
  group by q.id, q.body, q.author, q.created_at, q.pinned, p.id, p.options
  order by q.pinned desc, q.created_at desc
  limit p_limit + 1
  offset p_offset;
$$ language sql stable;

-- ── rpc: search questions with votes + pin + poll ─────────────────────────────
create or replace function search_questions_with_votes(p_query text, p_limit int)
returns table (
  id           uuid,
  body         text,
  author       text,
  created_at   timestamptz,
  net_votes    bigint,
  pinned       boolean,
  poll_id      uuid,
  poll_options text[]
) as $$
  select
    q.id,
    q.body,
    q.author,
    q.created_at,
    coalesce(
      sum(case when v.type = 'up' then 1 when v.type = 'down' then -1 else 0 end),
      0
    ) as net_votes,
    q.pinned,
    p.id as poll_id,
    p.options as poll_options
  from questions q
  left join votes v on v.question_id = q.id
  left join polls p on p.question_id = q.id
  where to_tsvector('english', q.body) @@ websearch_to_tsquery('english', p_query)
  group by q.id, q.body, q.author, q.created_at, q.pinned, p.id, p.options
  order by q.pinned desc, q.created_at desc
  limit p_limit;
$$ language sql stable;

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