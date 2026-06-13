-- Auto-score trigger: calls score_match() when a match transitions to 'finished'
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Trigger function
create or replace function public.trigger_auto_score_match()
returns trigger language plpgsql security definer as $$
begin
  -- Only fire when status changes TO 'finished' and scores are set
  if NEW.status = 'finished'
     and OLD.status <> 'finished'
     and NEW.home_score is not null
     and NEW.away_score is not null
  then
    perform public.score_match(NEW.id);
  end if;
  return NEW;
end;
$$;

-- 2. Drop old trigger if exists
drop trigger if exists auto_score_on_finish on public.matches;

-- 3. Create trigger
create trigger auto_score_on_finish
  after update on public.matches
  for each row
  execute function public.trigger_auto_score_match();
