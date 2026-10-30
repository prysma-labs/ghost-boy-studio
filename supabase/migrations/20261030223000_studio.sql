create schema studio;

grant usage on schema studio to service_role;
grant usage on schema studio to authenticator;

create table studio.messages (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  run_id uuid,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint messages_agent_id_known check (
    agent_id in ('director', 'designer', 'writer', 'musician', 'animator')
  ),
  constraint messages_role_known check (role in ('user', 'assistant'))
);

create table studio.runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  status text not null,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint runs_agent_id_known check (
    agent_id in ('director', 'designer', 'writer', 'musician', 'animator')
  ),
  constraint runs_status_known check (status in ('running', 'completed', 'failed'))
);

alter table studio.messages
  add constraint messages_run_id_fkey
  foreign key (run_id) references studio.runs (id);

create index messages_agent_created_idx
  on studio.messages (agent_id, created_at);

create index runs_agent_created_idx
  on studio.runs (agent_id, created_at desc);

create unique index runs_one_active_per_agent
  on studio.runs (agent_id)
  where status = 'running';

alter table studio.messages enable row level security;
alter table studio.runs enable row level security;

revoke all on table studio.messages from anon, authenticated, public;
revoke all on table studio.runs from anon, authenticated, public;
grant select, insert, update, delete on table studio.messages to service_role;
grant select, insert, update, delete on table studio.runs to service_role;

alter role authenticator set pgrst.db_schemas = 'public, storage, graphql_public, studio';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
