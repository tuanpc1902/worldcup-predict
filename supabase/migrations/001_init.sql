-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null default '',
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  total_points integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Matches
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  api_fixture_id integer unique,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  match_time timestamptz not null,
  stage text not null default 'group', -- group | round_of_32 | round_of_16 | quarter | semi | final
  group_name text,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished', 'cancelled')),
  home_score integer,
  away_score integer,
  is_locked boolean not null default false,
  api_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "Matches viewable by everyone"
  on public.matches for select using (true);

create policy "Admins can manage matches"
  on public.matches for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-lock match when start time is reached (handled by app logic)
create index on public.matches (match_time);
create index on public.matches (status);

-- Predictions
create table public.predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade,
  match_id uuid not null references public.matches on delete cascade,
  predicted_home integer not null,
  predicted_away integer not null,
  points_earned integer,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

alter table public.predictions enable row level security;

create policy "Users can view all predictions after match is finished"
  on public.predictions for select using (
    auth.uid() = user_id
    or exists (select 1 from public.matches m where m.id = match_id and m.status = 'finished')
  );

create policy "Users can insert own predictions on unlocked matches"
  on public.predictions for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.matches m where m.id = match_id and m.is_locked = false)
  );

create policy "Users can update own predictions on unlocked matches"
  on public.predictions for update using (
    auth.uid() = user_id
    and exists (select 1 from public.matches m where m.id = match_id and m.is_locked = false)
  );

create index on public.predictions (user_id);
create index on public.predictions (match_id);

-- Leaderboard view
create or replace view public.leaderboard as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.total_points,
  count(pr.id) filter (where pr.points_earned is not null) as total_predicted,
  count(pr.id) filter (where pr.points_earned = 5) as exact_scores,
  count(pr.id) filter (where pr.points_earned = 3) as correct_results,
  count(pr.id) filter (where pr.points_earned = -1) as wrong_predictions,
  rank() over (order by p.total_points desc) as rank
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.display_name, p.avatar_url, p.total_points
order by p.total_points desc;

-- Score a match (called by admin or cron)
create or replace function public.score_match(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  v_match public.matches%rowtype;
  v_pred record;
  v_pts integer;
begin
  select * into v_match from public.matches where id = p_match_id and status = 'finished';
  if not found then
    raise exception 'Match not found or not finished';
  end if;

  for v_pred in
    select * from public.predictions
    where match_id = p_match_id and points_earned is null
  loop
    -- Exact score
    if v_pred.predicted_home = v_match.home_score and v_pred.predicted_away = v_match.away_score then
      v_pts := 5;
    -- Correct result (W/D/L)
    elsif
      (v_pred.predicted_home > v_pred.predicted_away and v_match.home_score > v_match.away_score) or
      (v_pred.predicted_home = v_pred.predicted_away and v_match.home_score = v_match.away_score) or
      (v_pred.predicted_home < v_pred.predicted_away and v_match.home_score < v_match.away_score)
    then
      v_pts := 3;
    else
      v_pts := -1;
    end if;

    update public.predictions
    set points_earned = v_pts, scored_at = now()
    where id = v_pred.id;

    update public.profiles
    set total_points = total_points + v_pts
    where id = v_pred.user_id;
  end loop;
end;
$$;
