
-- ============ submissions additions ============
alter table public.submissions
  add column if not exists initial_ip text,
  add column if not exists latest_ip text,
  add column if not exists browser_session_id text,
  add column if not exists last_autosaved_at timestamptz;

create unique index if not exists submissions_round_country_uniq
  on public.submissions (round_id, lower(country));

create index if not exists submissions_session_idx on public.submissions (browser_session_id);

-- ============ ip history ============
create table if not exists public.submission_ip_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  ip_address text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (submission_id, ip_address)
);
grant select, insert, update, delete on public.submission_ip_history to authenticated;
grant all on public.submission_ip_history to service_role;
alter table public.submission_ip_history enable row level security;
create policy "ip history admin" on public.submission_ip_history for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============ drafts ============
create table if not exists public.submission_drafts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.submission_rounds(id) on delete cascade,
  browser_session_id text not null,
  payload jsonb not null default '{}'::jsonb,
  instagram_username text,
  country text,
  initial_ip text,
  latest_ip text,
  submitted_submission_id uuid references public.submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, browser_session_id)
);
grant select, insert, update, delete on public.submission_drafts to authenticated;
grant all on public.submission_drafts to service_role;
alter table public.submission_drafts enable row level security;
create policy "drafts admin" on public.submission_drafts for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create index if not exists drafts_round_ip_idx on public.submission_drafts (round_id, latest_ip);

-- ============ edit tokens ============
create table if not exists public.edit_tokens (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  token_hash text not null unique,
  token_type text not null default 'reusable',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  use_count integer not null default 0
);
grant select, insert, update, delete on public.edit_tokens to authenticated;
grant all on public.edit_tokens to service_role;
alter table public.edit_tokens enable row level security;
create policy "edit tokens admin" on public.edit_tokens for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============ public round stats (live counter, no PII) ============
create table if not exists public.round_stats (
  round_id uuid primary key references public.submission_rounds(id) on delete cascade,
  submitted_count integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.round_stats to anon, authenticated;
grant all on public.round_stats to service_role;
alter table public.round_stats enable row level security;
create policy "round stats public read" on public.round_stats for select to anon, authenticated using (true);

insert into public.round_stats (round_id, submitted_count)
select r.id, (select count(*) from public.submissions s where s.round_id = r.id)
from public.submission_rounds r
on conflict (round_id) do update set submitted_count = excluded.submitted_count;

create or replace function public.sync_round_stats()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  rid := coalesce(new.round_id, old.round_id);
  insert into public.round_stats (round_id, submitted_count, updated_at)
  values (rid, (select count(*) from public.submissions where round_id = rid), now())
  on conflict (round_id) do update
    set submitted_count = excluded.submitted_count, updated_at = now();
  return null;
end $$;

drop trigger if exists submissions_stats_trg on public.submissions;
create trigger submissions_stats_trg
after insert or delete on public.submissions
for each row execute function public.sync_round_stats();

create or replace function public.sync_round_stats_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.round_stats (round_id, submitted_count, updated_at)
  values (new.id, (select count(*) from public.submissions where round_id = new.id), now())
  on conflict (round_id) do update set updated_at = now();
  return null;
end $$;

drop trigger if exists rounds_stats_trg on public.submission_rounds;
create trigger rounds_stats_trg
after insert on public.submission_rounds
for each row execute function public.sync_round_stats_row();

-- ============ single source of truth for availability ============
create or replace function public.round_availability(_round_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.submission_rounds;
  e public.editions;
  cnt integer;
  reason text;
begin
  select * into r from public.submission_rounds where id = _round_id;
  if r is null then
    return jsonb_build_object('can_accept', false, 'reason', 'ROUND_DISABLED',
      'count', 0, 'limit', null, 'remaining', 0, 'status', null, 'server_time', now());
  end if;
  select * into e from public.editions where id = r.edition_id;
  select count(*) into cnt from public.submissions where round_id = r.id;

  if e is null or e.status <> 'active' then reason := 'ROUND_DISABLED';
  elsif r.status = 'draft' then reason := 'ROUND_DISABLED';
  elsif r.status in ('closed', 'auto_closed') and not (r.status = 'auto_closed' and (r.response_limit is null or cnt < r.response_limit)) then
    reason := case when r.status = 'auto_closed' then 'RESPONSE_LIMIT_REACHED' else 'MANUALLY_CLOSED' end;
  elsif r.status = 'closed' then reason := 'MANUALLY_CLOSED';
  elsif r.opens_at is not null and r.opens_at > now() then reason := 'NOT_OPEN_YET';
  elsif r.closes_at is not null and r.closes_at <= now() then reason := 'DEADLINE_PASSED';
  elsif r.response_limit is not null and cnt >= r.response_limit then reason := 'RESPONSE_LIMIT_REACHED';
  else reason := 'OPEN';
  end if;

  return jsonb_build_object(
    'can_accept', reason = 'OPEN',
    'reason', reason,
    'count', cnt,
    'limit', r.response_limit,
    'remaining', case when r.response_limit is null then null else greatest(r.response_limit - cnt, 0) end,
    'status', r.status,
    'opens_at', r.opens_at,
    'closes_at', r.closes_at,
    'server_time', now()
  );
end $$;

revoke all on function public.round_availability(uuid) from public;
grant execute on function public.round_availability(uuid) to anon, authenticated, service_role;

-- ============ atomic submit ============
create or replace function public.submit_confirmation(payload jsonb)
duplicate_result jsonb;
current_submission_id uuid;
current_submission_id :=
  case
    when is_edit then existing.id
    else '00000000-0000-0000-0000-000000000000'::uuid
  end;
if coalesce((payload->>'participating')::boolean, true)
   and payload->>'selection_method' = 'internal'
   and not coalesce((payload->>'entry_unknown')::boolean, false)
then

  duplicate_result := public.find_entry_duplicate(
    r.edition_id,
    current_submission_id,
    payload->>'artist',
    payload->>'song_title',
    payload->>'song_url'
  );

  if coalesce((duplicate_result->>'duplicate')::boolean, false) then

    if duplicate_result->>'type' = 'artist' then
      return jsonb_build_object(
        'ok', false,
        'error', 'duplicate_artist'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'error', 'duplicate_song'
    );

  end if;

end if;
duplicate_result := public.find_entry_duplicate(
  r.edition_id,
  sub.id,
  item->>'artist',
  item->>'song_title',
  item->>'song_url'
);

if coalesce((duplicate_result->>'duplicate')::boolean, false) then

  if duplicate_result->>'type' = 'artist' then
    raise exception 'DUPLICATE_ARTIST';
  else
    raise exception 'DUPLICATE_SONG';
  end if;

end if;
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  r public.submission_rounds;
  cnt integer;
  sub public.submissions;
  existing public.submissions;
  nf_id uuid;
  item jsonb;
  idx integer := 0;
  snap jsonb;
  avail jsonb;
  ip text := nullif(payload->>'client_ip','');
  sess text := nullif(payload->>'browser_session_id','');
  tok public.edit_tokens;
  is_edit boolean := false;
begin
  -- lock the round row to serialise concurrent final-spot submissions
  select * into r from public.submission_rounds where id = (payload->>'round_id')::uuid for update;
  if r is null then return jsonb_build_object('ok', false, 'error', 'closed'); end if;

  -- edit-token path (bypasses capacity, targets one submission only)
  if nullif(payload->>'edit_token_hash','') is not null then
    select * into tok from public.edit_tokens
      where token_hash = payload->>'edit_token_hash' and active
      and (expires_at is null or expires_at > now());
    if tok is null then return jsonb_build_object('ok', false, 'error', 'invalid_token'); end if;
    select * into existing from public.submissions where id = tok.submission_id;
    if existing is null then return jsonb_build_object('ok', false, 'error', 'invalid_token'); end if;
    is_edit := true;
  else
    select * into existing from public.submissions
      where round_id = r.id and lower(country) = lower(payload->>'country');
    if existing.id is not null then
      if existing.locked or not existing.editing_allowed then
        return jsonb_build_object('ok', false, 'error', 'duplicate');
      end if;
      is_edit := true;
    end if;
  end if;

  if not is_edit then
    avail := public.round_availability(r.id);
    if not (avail->>'can_accept')::boolean then
      return jsonb_build_object('ok', false, 'error',
        case avail->>'reason' when 'RESPONSE_LIMIT_REACHED' then 'full' else 'closed' end,
        'reason', avail->>'reason');
    end if;
  end if;

  if is_edit then
    snap := jsonb_build_object(
      'submission', to_jsonb(existing),
      'internal', (select to_jsonb(i) from public.internal_entries i where i.submission_id = existing.id),
      'national_final', (select to_jsonb(n) from public.national_finals n where n.submission_id = existing.id),
      'nf_entries', (select coalesce(jsonb_agg(to_jsonb(en) order by en.position), '[]'::jsonb)
                     from public.national_final_entries en
                     join public.national_finals n2 on n2.id = en.national_final_id
                     where n2.submission_id = existing.id)
    );
    insert into public.submission_versions (submission_id, version, snapshot)
      values (existing.id, existing.edit_count + 1, snap);
  end if;

  if not is_edit then
    insert into public.submissions (
      edition_id, round_id, instagram_username, country, country_account, has_country_account,
      participating, selection_method, entry_unknown, nf_entries_unknown,
      reveal_date_type, reveal_exact_date, reveal_approximate_text,
      nf_date_type, nf_exact_date, nf_approximate_text,
      nf_result_date_type, nf_result_exact_date, nf_result_approximate_text,
      initial_ip, latest_ip, browser_session_id
    ) values (
      r.edition_id, r.id, payload->>'instagram_username', payload->>'country', nullif(payload->>'country_account',''),
      coalesce((payload->>'has_country_account')::boolean,false),
      coalesce((payload->>'participating')::boolean,true), nullif(payload->>'selection_method',''),
      coalesce((payload->>'entry_unknown')::boolean,false), coalesce((payload->>'nf_entries_unknown')::boolean,false),
      nullif(payload->>'reveal_date_type',''), nullif(payload->>'reveal_exact_date','')::date, nullif(payload->>'reveal_approximate_text',''),
      nullif(payload->>'nf_date_type',''), nullif(payload->>'nf_exact_date','')::date, nullif(payload->>'nf_approximate_text',''),
      nullif(payload->>'nf_result_date_type',''), nullif(payload->>'nf_result_exact_date','')::date, nullif(payload->>'nf_result_approximate_text',''),
      ip, ip, sess
    ) returning * into sub;
  else
    update public.submissions set
      instagram_username = payload->>'instagram_username',
      country = coalesce(nullif(payload->>'country',''), country),
      country_account = nullif(payload->>'country_account',''),
      has_country_account = coalesce((payload->>'has_country_account')::boolean,false),
      participating = coalesce((payload->>'participating')::boolean,true),
      selection_method = nullif(payload->>'selection_method',''),
      entry_unknown = coalesce((payload->>'entry_unknown')::boolean,false),
      nf_entries_unknown = coalesce((payload->>'nf_entries_unknown')::boolean,false),
      reveal_date_type = nullif(payload->>'reveal_date_type',''),
      reveal_exact_date = nullif(payload->>'reveal_exact_date','')::date,
      reveal_approximate_text = nullif(payload->>'reveal_approximate_text',''),
      nf_date_type = nullif(payload->>'nf_date_type',''),
      nf_exact_date = nullif(payload->>'nf_exact_date','')::date,
      nf_approximate_text = nullif(payload->>'nf_approximate_text',''),
      nf_result_date_type = nullif(payload->>'nf_result_date_type',''),
      nf_result_exact_date = nullif(payload->>'nf_result_exact_date','')::date,
      nf_result_approximate_text = nullif(payload->>'nf_result_approximate_text',''),
      edit_count = existing.edit_count + 1,
      editing_allowed = false,
      latest_ip = coalesce(ip, latest_ip),
      initial_ip = coalesce(initial_ip, ip),
      updated_at = now()
    where id = existing.id returning * into sub;
    delete from public.internal_entries where submission_id = sub.id;
    delete from public.national_finals where submission_id = sub.id;
  end if;

  if ip is not null then
    insert into public.submission_ip_history (submission_id, ip_address)
    values (sub.id, ip)
    on conflict (submission_id, ip_address) do update set last_seen_at = now();
  end if;

  if sub.participating and sub.selection_method = 'internal' then
    insert into public.internal_entries (submission_id, artist, song_title, song_url, preview_start, preview_end,
      final_clip_start, final_clip_end, replacement_video_required, replacement_video_url)
    values (sub.id, nullif(payload->>'artist',''), nullif(payload->>'song_title',''), nullif(payload->>'song_url',''),
      nullif(payload->>'preview_start',''), nullif(payload->>'preview_end',''),
      nullif(payload->>'final_clip_start',''), nullif(payload->>'final_clip_end',''),
      coalesce((payload->>'replacement_video_required')::boolean,false), nullif(payload->>'replacement_video_url',''));
  end if;

  if sub.participating and sub.selection_method = 'national_final' then
    insert into public.national_finals (submission_id, nf_name, expected_entry_count)
    values (sub.id, nullif(payload->>'nf_name',''), nullif(payload->>'expected_entry_count','')::integer)
    returning id into nf_id;
    for item in select * from jsonb_array_elements(coalesce(payload->'nf_entries','[]'::jsonb)) loop
      insert into public.national_final_entries (national_final_id, artist, song_title, song_url, position)
      values (nf_id, nullif(item->>'artist',''), nullif(item->>'song_title',''), nullif(item->>'song_url',''), idx);
      idx := idx + 1;
    end loop;
  end if;

  -- consume edit token
  if tok.id is not null then
    update public.edit_tokens set
      use_count = use_count + 1,
      last_used_at = now(),
      active = case when token_type = 'one_time' then false else active end
    where id = tok.id;
  end if;

  -- auto close when full
  select count(*) into cnt from public.submissions where round_id = r.id;
  if r.response_limit is not null and cnt >= r.response_limit and r.status = 'open' then
    update public.submission_rounds set status = 'auto_closed' where id = r.id;
  end if;

  -- clear the draft for this session
  if sess is not null then
    update public.submission_drafts set submitted_submission_id = sub.id, updated_at = now()
      where round_id = r.id and browser_session_id = sess;
  end if;

  return jsonb_build_object('ok', true, 'submission_id', sub.id);
end;
$function$;

-- ============ realtime ============
alter table public.submission_rounds replica identity full;
alter table public.round_stats replica identity full;
alter table public.submissions replica identity full;
alter table public.submission_drafts replica identity full;

do $$ begin
  begin alter publication supabase_realtime add table public.submission_rounds; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.round_stats; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.submissions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.submission_drafts; exception when duplicate_object then null; end;
end $$;
