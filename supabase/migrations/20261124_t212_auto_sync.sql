alter table public.broker_t212_connections
  add column if not exists portfolio_id uuid references public.portfolios(id) on delete set null,
  add column if not exists sync_state text not null default 'bereit' check (sync_state in ('bereit','laeuft','fehler')),
  add column if not exists sync_message text,
  add column if not exists sync_started_at timestamptz,
  add column if not exists synced_until timestamptz,
  add column if not exists last_check jsonb;

-- Welche Buchung beim Broker zu welcher Buchung im Depot gehört. Nur der Server schreibt und liest.
create table if not exists public.broker_sync_items (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  external_id text not null,
  transaction_id uuid not null references public.portfolio_transactions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (portfolio_id, external_id)
);
create index if not exists broker_sync_items_transaction_idx on public.broker_sync_items (transaction_id);
alter table public.broker_sync_items enable row level security;
revoke all on public.broker_sync_items from anon, authenticated;
grant select, insert, update, delete on public.broker_sync_items to service_role;

-- Die Tabelle war als "nur der Server" gedacht, der Serverrolle fehlten aber die Rechte:
-- Verbindungen konnten deshalb nie gespeichert werden.
grant select, insert, update, delete on public.broker_t212_connections to service_role;
