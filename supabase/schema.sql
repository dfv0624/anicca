create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  role text not null,
  emoji text not null default '🚀',
  description text not null,
  story text not null,
  amount_cents integer not null default 0,
  creator_amount_units numeric(30, 8) not null default 0,
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
  token_symbol text not null check (token_symbol in ('USDT', 'COPM')),
  amount_units text not null,
  creator_amount_units text,
  platform_fee_units text,
  tx_hash text not null unique,
  chain_id integer not null,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

alter table public.campaigns
add column if not exists creator_amount_units numeric(30, 8) not null default 0;

alter table public.contributions
drop constraint if exists contributions_token_symbol_check;

alter table public.contributions
add constraint contributions_token_symbol_check
check (token_symbol in ('USDT', 'COPM')) not valid;

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
declare
  creator_amount numeric := 0;
  creator_units text := coalesce(new.creator_amount_units, '');
begin
  if creator_units = '' and new.amount_units ~ '^[0-9]+(\.[0-9]+)?$' then
    creator_units := ((new.amount_units::numeric) * 0.97)::text;
  end if;

  if creator_units ~ '^[0-9]+(\.[0-9]+)?$' then
    creator_amount := round(creator_units::numeric, 8);
  end if;

  update public.campaigns
  set
    contribution_count = contribution_count + 1,
    creator_amount_units = creator_amount_units + creator_amount,
    amount_cents = round((creator_amount_units + creator_amount) * 100)::integer
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
set
  contribution_count = (
    select count(*)
    from public.contributions contribution
    where contribution.campaign_id = campaign.id
  ),
  creator_amount_units = (
    select coalesce(
      sum(
        case
          when contribution.creator_amount_units ~ '^[0-9]+(\.[0-9]+)?$'
            then round(contribution.creator_amount_units::numeric, 8)
          when contribution.amount_units ~ '^[0-9]+(\.[0-9]+)?$'
            then round((contribution.amount_units::numeric) * 0.97, 8)
          else 0
        end
      ),
      0
    )
    from public.contributions contribution
    where contribution.campaign_id = campaign.id
  ),
  amount_cents = round((
    select coalesce(
      sum(
        case
          when contribution.creator_amount_units ~ '^[0-9]+(\.[0-9]+)?$'
            then round(contribution.creator_amount_units::numeric, 8)
          when contribution.amount_units ~ '^[0-9]+(\.[0-9]+)?$'
            then round((contribution.amount_units::numeric) * 0.97, 8)
          else 0
        end
      ),
      0
    )
    from public.contributions contribution
    where contribution.campaign_id = campaign.id
  ) * 100)::integer;
