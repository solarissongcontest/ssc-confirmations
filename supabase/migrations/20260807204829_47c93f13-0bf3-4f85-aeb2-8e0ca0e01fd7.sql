
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition_number integer not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
grant select on public.editions to anon, authenticated;
grant insert, update, delete on public.editions to authenticated;
grant all on public.editions to service_role;
alter table public.editions enable row level security;
create policy "editions public read" on public.editions for select to anon, authenticated using (true);
create policy "editions admin write" on public.editions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.submission_rounds (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  response_limit integer,
  created_at timestamptz not null default now()
);
grant select on public.submission_rounds to anon, authenticated;
grant insert, update, delete on public.submission_rounds to authenticated;
grant all on public.submission_rounds to service_role;
alter table public.submission_rounds enable row level security;
create policy "rounds public read" on public.submission_rounds for select to anon, authenticated using (true);
create policy "rounds admin write" on public.submission_rounds for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  round_id uuid not null references public.submission_rounds(id) on delete cascade,
  instagram_username text not null,
  country text not null,
  country_account text,
  has_country_account boolean not null default false,
  participating boolean not null default true,
  selection_method text,
  entry_unknown boolean not null default false,
  nf_entries_unknown boolean not null default false,
  reveal_date_type text,
  reveal_exact_date date,
  reveal_approximate_text text,
  nf_date_type text,
  nf_exact_date date,
  nf_approximate_text text,
  nf_result_date_type text,
  nf_result_exact_date date,
  nf_result_approximate_text text,
  editing_allowed boolean not null default false,
  locked boolean not null default false,
  reviewed boolean not null default false,
  admin_notes text,
  edit_count integer not null default 0,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index submissions_country_round_uniq on public.submissions (round_id, lower(country));
grant select, insert, update, delete on public.submissions to authenticated;
grant all on public.submissions to service_role;
alter table public.submissions enable row level security;
create policy "submissions admin" on public.submissions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.internal_entries (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  artist text,
  song_title text,
  song_url text,
  preview_start text,
  preview_end text,
  final_clip_start text,
  final_clip_end text,
  replacement_video_required boolean not null default false,
  replacement_video_url text
);
grant select, insert, update, delete on public.internal_entries to authenticated;
grant all on public.internal_entries to service_role;
alter table public.internal_entries enable row level security;
create policy "internal admin" on public.internal_entries for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.national_finals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  nf_name text,
  expected_entry_count integer,
  winning_entry_id uuid
);
grant select, insert, update, delete on public.national_finals to authenticated;
grant all on public.national_finals to service_role;
alter table public.national_finals enable row level security;
create policy "nf admin" on public.national_finals for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.national_final_entries (
  id uuid primary key default gen_random_uuid(),
  national_final_id uuid not null references public.national_finals(id) on delete cascade,
  artist text,
  song_title text,
  song_url text,
  position integer not null default 0
);
grant select, insert, update, delete on public.national_final_entries to authenticated;
grant all on public.national_final_entries to service_role;
alter table public.national_final_entries enable row level security;
create policy "nfe admin" on public.national_final_entries for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
grant select on public.submission_versions to authenticated;
grant all on public.submission_versions to service_role;
alter table public.submission_versions enable row level security;
create policy "versions admin" on public.submission_versions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- effective round state helper
create or replace function public.round_is_open(_round public.submission_rounds, _count integer)
returns boolean language sql stable as $$
  select _round.status = 'open'
    and (_round.opens_at is null or _round.opens_at <= now())
    and (_round.closes_at is null or _round.closes_at > now())
    and (_round.response_limit is null or _count < _round.response_limit)
$$;

-- atomic submit / update
create or replace function public.submit_confirmation(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.submission_rounds;
  cnt integer;
  sub public.submissions;
  existing public.submissions;
  nf_id uuid;
  item jsonb;
  idx integer := 0;
  snap jsonb;
begin
  select * into r from public.submission_rounds where id = (payload->>'round_id')::uuid for update;
  if r is null then return jsonb_build_object('ok', false, 'error', 'Round not found'); end if;

  select * into existing from public.submissions
    where round_id = r.id and lower(country) = lower(payload->>'country');

  select count(*) into cnt from public.submissions where round_id = r.id;

  if existing.id is null then
    if not public.round_is_open(r, cnt) then
      if r.response_limit is not null and cnt >= r.response_limit then
        return jsonb_build_object('ok', false, 'error', 'full');
      end if;
      return jsonb_build_object('ok', false, 'error', 'closed');
    end if;
  else
    if existing.locked or not existing.editing_allowed then
      return jsonb_build_object('ok', false, 'error', 'duplicate');
    end if;
    -- snapshot previous version
    snap := jsonb_build_object(
      'submission', to_jsonb(existing),
      'internal', (select to_jsonb(i) from public.internal_entries i where i.submission_id = existing.id),
      'national_final', (select to_jsonb(n) from public.national_finals n where n.submission_id = existing.id),
      'nf_entries', (select coalesce(jsonb_agg(to_jsonb(e) order by e.position), '[]'::jsonb)
                     from public.national_final_entries e
                     join public.national_finals n2 on n2.id = e.national_final_id
                     where n2.submission_id = existing.id)
    );
    insert into public.submission_versions (submission_id, version, snapshot)
      values (existing.id, existing.edit_count + 1, snap);
  end if;

  if existing.id is null then
    insert into public.submissions (
      edition_id, round_id, instagram_username, country, country_account, has_country_account,
      participating, selection_method, entry_unknown, nf_entries_unknown,
      reveal_date_type, reveal_exact_date, reveal_approximate_text,
      nf_date_type, nf_exact_date, nf_approximate_text,
      nf_result_date_type, nf_result_exact_date, nf_result_approximate_text
    ) values (
      r.edition_id, r.id, payload->>'instagram_username', payload->>'country', nullif(payload->>'country_account',''),
      coalesce((payload->>'has_country_account')::boolean,false),
      coalesce((payload->>'participating')::boolean,true), nullif(payload->>'selection_method',''),
      coalesce((payload->>'entry_unknown')::boolean,false), coalesce((payload->>'nf_entries_unknown')::boolean,false),
      nullif(payload->>'reveal_date_type',''), nullif(payload->>'reveal_exact_date','')::date, nullif(payload->>'reveal_approximate_text',''),
      nullif(payload->>'nf_date_type',''), nullif(payload->>'nf_exact_date','')::date, nullif(payload->>'nf_approximate_text',''),
      nullif(payload->>'nf_result_date_type',''), nullif(payload->>'nf_result_exact_date','')::date, nullif(payload->>'nf_result_approximate_text','')
    ) returning * into sub;
  else
    update public.submissions set
      instagram_username = payload->>'instagram_username',
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
      updated_at = now()
    where id = existing.id returning * into sub;
    delete from public.internal_entries where submission_id = sub.id;
    delete from public.national_finals where submission_id = sub.id;
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

  -- auto close when full
  select count(*) into cnt from public.submissions where round_id = r.id;
  if r.response_limit is not null and cnt >= r.response_limit and r.status = 'open' then
    update public.submission_rounds set status = 'auto_closed' where id = r.id;
  end if;

  return jsonb_build_object('ok', true, 'submission_id', sub.id);
end;
$$;
revoke all on function public.submit_confirmation(jsonb) from public, anon, authenticated;
