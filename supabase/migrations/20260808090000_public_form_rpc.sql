-- ============================================================
-- PUBLIC FORM RPC ACCESS
--
-- Allows the public confirmation form to function using the
-- Supabase publishable key instead of requiring service_role.
--
-- Sensitive tables remain protected by RLS.
-- Only these restricted SECURITY DEFINER functions can access them.
-- ============================================================


-- ------------------------------------------------------------
-- ROUND AVAILABILITY
-- ------------------------------------------------------------

revoke all
on function public.round_availability(uuid)
from public;

grant execute
on function public.round_availability(uuid)
to anon, authenticated, service_role;


-- ------------------------------------------------------------
-- SUBMIT CONFIRMATION
--
-- submit_confirmation is already SECURITY DEFINER and performs
-- the server-side capacity/duplicate/edit checks.
-- ------------------------------------------------------------

revoke all
on function public.submit_confirmation(jsonb)
from public;

grant execute
on function public.submit_confirmation(jsonb)
to anon, authenticated, service_role;


-- ============================================================
-- LOOK UP EXISTING COUNTRY SUBMISSION
-- ============================================================

create or replace function public.public_lookup_submission(
  _round_id uuid,
  _country text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.submissions;
  internal_data jsonb;
  nf_data jsonb;
begin

  select *
  into s
  from public.submissions
  where
    round_id = _round_id
    and lower(country) = lower(trim(_country))
  limit 1;

  if s is null then
    return jsonb_build_object(
      'exists', false
    );
  end if;

  if s.locked or not s.editing_allowed then
    return jsonb_build_object(
      'exists', true,
      'can_edit', false
    );
  end if;

  select to_jsonb(i)
  into internal_data
  from public.internal_entries i
  where i.submission_id = s.id
  limit 1;

  select
    case
      when nf.id is null then null
      else
        to_jsonb(nf) ||
        jsonb_build_object(
          'national_final_entries',
          coalesce(
            (
              select jsonb_agg(
                to_jsonb(e)
                order by e.position
              )
              from public.national_final_entries e
              where e.national_final_id = nf.id
            ),
            '[]'::jsonb
          )
        )
    end
  into nf_data
  from public.national_finals nf
  where nf.submission_id = s.id
  limit 1;

  return jsonb_build_object(
    'exists', true,
    'can_edit', true,
    'submission',
      to_jsonb(s) ||
      jsonb_build_object(
        'internal_entries',
        internal_data,
        'national_finals',
        nf_data
      )
  );

end;
$$;

revoke all
on function public.public_lookup_submission(uuid, text)
from public;

grant execute
on function public.public_lookup_submission(uuid, text)
to anon, authenticated, service_role;


-- ============================================================
-- SAVE DRAFT
-- ============================================================

create or replace function public.public_save_draft(
  _round_id uuid,
  _browser_session_id text,
  _payload jsonb,
  _instagram_username text,
  _country text,
  _ip text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_row public.submission_drafts;
  saved_time timestamptz := now();
begin

  if
    _browser_session_id is null
    or length(trim(_browser_session_id)) < 1
    or length(_browser_session_id) > 80
  then
    return jsonb_build_object(
      'ok', false
    );
  end if;

  select *
  into existing_row
  from public.submission_drafts
  where
    round_id = _round_id
    and browser_session_id = _browser_session_id
  limit 1;

  if existing_row.id is not null then

    update public.submission_drafts
    set
      payload = _payload,
      instagram_username = nullif(trim(_instagram_username), ''),
      country = nullif(trim(_country), ''),
      latest_ip = _ip,
      initial_ip = coalesce(initial_ip, _ip),
      updated_at = saved_time
    where id = existing_row.id;

  else

    insert into public.submission_drafts (
      round_id,
      browser_session_id,
      payload,
      instagram_username,
      country,
      initial_ip,
      latest_ip,
      updated_at
    )
    values (
      _round_id,
      _browser_session_id,
      _payload,
      nullif(trim(_instagram_username), ''),
      nullif(trim(_country), ''),
      _ip,
      _ip,
      saved_time
    );

  end if;

  return jsonb_build_object(
    'ok', true,
    'saved_at', saved_time
  );

end;
$$;

revoke all
on function public.public_save_draft(
  uuid,
  text,
  jsonb,
  text,
  text,
  text
)
from public;

grant execute
on function public.public_save_draft(
  uuid,
  text,
  jsonb,
  text,
  text,
  text
)
to anon, authenticated, service_role;


-- ============================================================
-- LOAD DRAFT
-- ============================================================

create or replace function public.public_load_draft(
  _round_id uuid,
  _browser_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.submission_drafts;
begin

  select *
  into d
  from public.submission_drafts
  where
    round_id = _round_id
    and browser_session_id = _browser_session_id
  limit 1;

  if
    d.id is null
    or d.submitted_submission_id is not null
  then
    return jsonb_build_object(
      'found', false
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'payload', d.payload,
    'updated_at', d.updated_at
  );

end;
$$;

revoke all
on function public.public_load_draft(uuid, text)
from public;

grant execute
on function public.public_load_draft(uuid, text)
to anon, authenticated, service_role;


-- ============================================================
-- FIND SUBMISSION FROM THIS BROWSER
-- ============================================================

create or replace function public.public_find_my_submission(
  _round_id uuid,
  _browser_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.submissions;
begin

  select *
  into s
  from public.submissions
  where
    round_id = _round_id
    and browser_session_id = _browser_session_id
  order by submitted_at desc
  limit 1;

  if s.id is null then
    return jsonb_build_object(
      'found', false
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'submission',
    jsonb_build_object(
      'id', s.id,
      'country', s.country,
      'instagram_username', s.instagram_username,
      'submitted_at', s.submitted_at,
      'editing_allowed', s.editing_allowed,
      'locked', s.locked
    )
  );

end;
$$;

revoke all
on function public.public_find_my_submission(uuid, text)
from public;

grant execute
on function public.public_find_my_submission(uuid, text)
to anon, authenticated, service_role;


-- ============================================================
-- RESOLVE PRIVATE EDIT TOKEN
-- ============================================================

create or replace function public.public_resolve_edit_token(
  _token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tok public.edit_tokens;
  s public.submissions;
  r public.submission_rounds;
  e public.editions;

  internal_data jsonb;
  nf_data jsonb;
begin

  select *
  into tok
  from public.edit_tokens
  where
    token_hash = _token_hash
    and active = true
    and (
      expires_at is null
      or expires_at > now()
    )
  limit 1;

  if tok.id is null then
    return jsonb_build_object(
      'valid', false,
      'reason', 'invalid'
    );
  end if;

  select *
  into s
  from public.submissions
  where id = tok.submission_id;

  if s.id is null then
    return jsonb_build_object(
      'valid', false,
      'reason', 'invalid'
    );
  end if;

  if s.locked then
    return jsonb_build_object(
      'valid', false,
      'reason', 'locked'
    );
  end if;

  select *
  into r
  from public.submission_rounds
  where id = s.round_id;

  select *
  into e
  from public.editions
  where id = r.edition_id;

  select to_jsonb(i)
  into internal_data
  from public.internal_entries i
  where i.submission_id = s.id
  limit 1;

  select
    case
      when nf.id is null then null
      else
        to_jsonb(nf) ||
        jsonb_build_object(
          'national_final_entries',
          coalesce(
            (
              select jsonb_agg(
                to_jsonb(nfe)
                order by nfe.position
              )
              from public.national_final_entries nfe
              where nfe.national_final_id = nf.id
            ),
            '[]'::jsonb
          )
        )
    end
  into nf_data
  from public.national_finals nf
  where nf.submission_id = s.id
  limit 1;

  return jsonb_build_object(
    'valid', true,
    'reason', 'ok',

    'submission',
      to_jsonb(s) ||
      jsonb_build_object(
        'internal_entries',
        internal_data,
        'national_finals',
        nf_data
      ),

    'round',
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'status', r.status,
        'opens_at', r.opens_at,
        'closes_at', r.closes_at,
        'response_limit', r.response_limit,
        'edition_id', e.id,
        'edition_name', e.name,
        'edition_number', e.edition_number
      )
  );

end;
$$;

revoke all
on function public.public_resolve_edit_token(text)
from public;

grant execute
on function public.public_resolve_edit_token(text)
to anon, authenticated, service_role;
