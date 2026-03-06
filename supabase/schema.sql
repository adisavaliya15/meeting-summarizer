-- meeting-summarizer/supabase/schema.sql
begin;

create extension if not exists pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
    CREATE TYPE job_type AS ENUM (
      'TRANSCRIBE_CHUNK',
      'SUMMARIZE_CHUNK',
      'FINALIZE_SESSION',
      'SUMMARIZE_NOTE'
    );
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t on t.oid = e.enumtypid
    WHERE t.typname = 'job_type'
      AND e.enumlabel = 'SUMMARIZE_NOTE'
  ) THEN
    ALTER TYPE job_type ADD VALUE 'SUMMARIZE_NOTE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM (
      'PENDING',
      'RUNNING',
      'DONE',
      'FAILED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chunk_status') THEN
    CREATE TYPE chunk_status AS ENUM (
      'INIT',
      'WAITING_UPLOAD',
      'UPLOADED',
      'TRANSCRIBING',
      'TRANSCRIBED',
      'SUMMARIZING',
      'COMPLETED',
      'ERROR'
    );
  END IF;
END$$;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  final_summary jsonb,
  final_summary_md text
);

create table if not exists manual_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  summary jsonb,
  summary_md text,
  summarized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety for existing projects that previously had one note per owner.
alter table manual_notes add column if not exists title text;
update manual_notes
set title = 'Untitled note'
where title is null or btrim(title) = '';
alter table manual_notes alter column title set default 'Untitled note';
alter table manual_notes alter column title set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'manual_notes_owner_id_key'
      and conrelid = 'manual_notes'::regclass
  ) then
    alter table manual_notes drop constraint manual_notes_owner_id_key;
  end if;
end
$$;

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  idx integer not null check (idx >= 0),
  storage_bucket text not null default 'recordings',
  storage_key text,
  mime_type text not null,
  duration_sec numeric(10,2),
  transcript jsonb,
  chunk_summary jsonb,
  status chunk_status not null default 'INIT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, idx)
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type job_type not null,
  status job_status not null default 'PENDING',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  attempts integer not null default 0,
  last_error text
);

create index if not exists sessions_owner_created_idx on sessions(owner_id, created_at desc);
create index if not exists manual_notes_owner_updated_idx on manual_notes(owner_id, updated_at desc);
create index if not exists chunks_session_idx_idx on chunks(session_id, idx);
create index if not exists chunks_owner_status_idx on chunks(owner_id, status);
create index if not exists chunks_status_created_idx on chunks(status, created_at);
create index if not exists jobs_status_created_idx on jobs(status, created_at);
create index if not exists jobs_owner_created_idx on jobs(owner_id, created_at desc);
create index if not exists jobs_type_status_idx on jobs(type, status);

create unique index if not exists jobs_active_chunk_unique
  on jobs ((payload->>'chunk_id'), type)
  where type in ('TRANSCRIBE_CHUNK', 'SUMMARIZE_CHUNK')
    and status in ('PENDING', 'RUNNING');

create unique index if not exists jobs_active_finalize_unique
  on jobs ((payload->>'session_id'), type)
  where type = 'FINALIZE_SESSION'
    and status in ('PENDING', 'RUNNING');

create unique index if not exists jobs_active_note_summary_unique
  on jobs ((payload->>'note_id'), type)
  where payload ? 'note_id'
    and status in ('PENDING', 'RUNNING');

alter table sessions enable row level security;
alter table manual_notes enable row level security;
alter table chunks enable row level security;
alter table jobs enable row level security;

alter table sessions force row level security;
alter table manual_notes force row level security;
alter table chunks force row level security;
alter table jobs force row level security;

-- sessions: users can only manage their own rows.
drop policy if exists sessions_select_own on sessions;
create policy sessions_select_own
  on sessions for select
  using (auth.uid() = owner_id);

drop policy if exists sessions_insert_own on sessions;
create policy sessions_insert_own
  on sessions for insert
  with check (auth.uid() = owner_id);

drop policy if exists sessions_update_own on sessions;
create policy sessions_update_own
  on sessions for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists sessions_delete_own on sessions;
create policy sessions_delete_own
  on sessions for delete
  using (auth.uid() = owner_id);

-- manual_notes: users can only manage their own note row.
drop policy if exists manual_notes_select_own on manual_notes;
create policy manual_notes_select_own
  on manual_notes for select
  using (auth.uid() = owner_id);

drop policy if exists manual_notes_insert_own on manual_notes;
create policy manual_notes_insert_own
  on manual_notes for insert
  with check (auth.uid() = owner_id);

drop policy if exists manual_notes_update_own on manual_notes;
create policy manual_notes_update_own
  on manual_notes for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists manual_notes_delete_own on manual_notes;
create policy manual_notes_delete_own
  on manual_notes for delete
  using (auth.uid() = owner_id);

-- chunks: users can only manage chunks for their own sessions.
drop policy if exists chunks_select_own on chunks;
create policy chunks_select_own
  on chunks for select
  using (auth.uid() = owner_id);

drop policy if exists chunks_insert_own on chunks;
create policy chunks_insert_own
  on chunks for insert
  with check (auth.uid() = owner_id);

drop policy if exists chunks_update_own on chunks;
create policy chunks_update_own
  on chunks for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists chunks_delete_own on chunks;
create policy chunks_delete_own
  on chunks for delete
  using (auth.uid() = owner_id);

-- jobs: users can read their own jobs; no client job mutations by default.
drop policy if exists jobs_select_own on jobs;
create policy jobs_select_own
  on jobs for select
  using (auth.uid() = owner_id);

revoke insert, update, delete on jobs from authenticated, anon;
grant select on jobs to authenticated;
grant select, insert, update, delete on sessions, manual_notes, chunks to authenticated;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chunks_set_updated_at on chunks;
create trigger chunks_set_updated_at
before update on chunks
for each row execute function set_updated_at();

drop trigger if exists manual_notes_set_updated_at on manual_notes;
create trigger manual_notes_set_updated_at
before update on manual_notes
for each row execute function set_updated_at();

commit;
