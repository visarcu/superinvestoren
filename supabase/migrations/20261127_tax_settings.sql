-- Steuerangaben je Nutzer für die Ansicht "Steuern" im Depot: Veranlagung,
-- Kirchensteuer und Freistellungsauftrag je Depot ({"<portfolio_id>": 600}).
-- Nur der Server liest und schreibt (/api/portfolio/taxes).
create table if not exists public.tax_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joint_assessment boolean not null default false,
  church_tax_rate smallint not null default 0 check (church_tax_rate in (0, 8, 9)),
  exemption_orders jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.tax_settings enable row level security;
revoke all on public.tax_settings from anon, authenticated;
grant select, insert, update, delete on public.tax_settings to service_role;
