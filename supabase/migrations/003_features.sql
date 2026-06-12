-- Champion picks
create table public.champion_picks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade unique,
  team_name text not null,
  points_earned integer,
  created_at timestamptz not null default now()
);
alter table public.champion_picks enable row level security;
create policy "Users view all champion picks" on public.champion_picks for select using (true);
create policy "Users manage own pick" on public.champion_picks for all using (auth.uid() = user_id);

-- Groups (private rooms)
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text not null unique default upper(substring(md5(random()::text), 1, 6)),
  owner_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

-- Group members (tạo TRƯỚC khi add policy cho groups)
create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- RLS groups (sau khi group_members đã tồn tại)
alter table public.groups enable row level security;
create policy "Group members can view" on public.groups for select using (
  exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid())
  or owner_id = auth.uid()
);
create policy "Anyone can create group" on public.groups for insert with check (auth.uid() = owner_id);
create policy "Owner can update" on public.groups for update using (auth.uid() = owner_id);

-- RLS group_members
alter table public.group_members enable row level security;
create policy "Members can view group members" on public.group_members for select using (
  exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
);
create policy "Users can join groups" on public.group_members for insert with check (auth.uid() = user_id);
create policy "Users can leave groups" on public.group_members for delete using (auth.uid() = user_id);

-- Match comments
create table public.match_comments (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  reactions jsonb not null default '{"🔥":0,"😱":0,"👍":0,"😂":0}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.match_comments enable row level security;
create policy "Anyone can read comments" on public.match_comments for select using (true);
create policy "Logged in users can comment" on public.match_comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comments" on public.match_comments for delete using (auth.uid() = user_id);
create index on public.match_comments (match_id, created_at);

-- Group leaderboard view
create or replace view public.group_leaderboard as
select
  gm.group_id,
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  p.total_points,
  rank() over (partition by gm.group_id order by p.total_points desc) as rank
from public.group_members gm
join public.profiles p on p.id = gm.user_id;

-- Score champion picks
create or replace function public.score_champion(p_winner text)
returns void language plpgsql security definer as $$
begin
  update public.champion_picks
  set points_earned = case when team_name = p_winner then 20 else 0 end
  where points_earned is null;

  update public.profiles p
  set total_points = total_points + 20
  from public.champion_picks cp
  where cp.user_id = p.id and cp.team_name = p_winner and cp.points_earned = 20;
end;
$$;
