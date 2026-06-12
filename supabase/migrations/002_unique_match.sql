alter table public.matches
  add constraint matches_home_away_time_unique unique (home_team, away_team, match_time);
