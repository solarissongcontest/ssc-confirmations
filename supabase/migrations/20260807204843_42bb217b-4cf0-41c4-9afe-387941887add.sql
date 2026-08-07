
create or replace function public.round_is_open(_round public.submission_rounds, _count integer)
returns boolean language sql stable set search_path = public as $$
  select _round.status = 'open'
    and (_round.opens_at is null or _round.opens_at <= now())
    and (_round.closes_at is null or _round.closes_at > now())
    and (_round.response_limit is null or _count < _round.response_limit)
$$;
revoke all on function public.round_is_open(public.submission_rounds, integer) from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.submit_confirmation(jsonb) from public, anon, authenticated;
