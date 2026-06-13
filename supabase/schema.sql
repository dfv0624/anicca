create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  role text not null,
  emoji text not null default '🚀',
  description text not null,
  story text not null,
  amount_cents integer not null default 0,
  contribution_count integer not null default 0,
  video_url text,
  wallet_address text not null,
  created_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

drop policy if exists "Campaigns are readable by everyone" on public.campaigns;
create policy "Campaigns are readable by everyone"
on public.campaigns
for select
using (true);

drop policy if exists "Anyone can create campaigns" on public.campaigns;
create policy "Anyone can create campaigns"
on public.campaigns
for insert
with check (true);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  contributor_wallet text not null,
  recipient_wallet text not null,
  token_symbol text not null check (token_symbol in ('CELO', 'COPM')),
  amount_units text not null,
  creator_amount_units text,
  platform_fee_units text,
  tx_hash text not null unique,
  chain_id integer not null,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

alter table public.contributions enable row level security;

drop policy if exists "Contributions are readable by everyone" on public.contributions;
create policy "Contributions are readable by everyone"
on public.contributions
for select
using (true);

drop policy if exists "Anyone can create contributions" on public.contributions;
create policy "Anyone can create contributions"
on public.contributions
for insert
with check (true);

create or replace function public.increment_campaign_contribution_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.campaigns
  set contribution_count = contribution_count + 1
  where id = new.campaign_id;

  return new;
end;
$$;

drop trigger if exists contributions_increment_campaign_count on public.contributions;
create trigger contributions_increment_campaign_count
after insert on public.contributions
for each row
execute function public.increment_campaign_contribution_count();

update public.campaigns campaign
set contribution_count = (
  select count(*)
  from public.contributions contribution
  where contribution.campaign_id = campaign.id
);
