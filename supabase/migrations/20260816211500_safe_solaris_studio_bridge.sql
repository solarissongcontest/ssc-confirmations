-- Safe compatibility bridge between the standalone Confirmations backend and
-- Solaris Studio. The standalone app and its existing admin authentication must
-- continue to work unchanged.
--
-- IMPORTANT: Do NOT set pgrst.db_pre_request here. A PostgREST pre-request hook
-- affects every REST/RPC caller, including the standalone public site and its
-- service-role admin server functions.

create extension if not exists http with schema extensions;

alter role authenticator reset pgrst.db_pre_request;
notify pgrst, 'reload config';

delete from public.user_roles
where user_id = '00000000-0000-4000-8000-000000000001'::uuid
  and role = 'admin'::public.app_role;

drop function if exists public.solaris_admin_pre_request();

-- Restore the original local Confirmations role model.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Solaris Studio sends its current user access token in a dedicated request
-- header. Confirmations never treats that token as a local Supabase JWT. Instead
-- this private verifier asks Solaris Studio whether that authenticated user has
-- the organizer role.
create or replace function public.is_solaris_organizer_request()
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  request_headers jsonb;
  access_token text;
  response extensions.http_response;
  response_json jsonb;
begin
  request_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  access_token := nullif(request_headers ->> 'x-solaris-access-token', '');

  if access_token is null then
    return false;
  end if;

  select *
  into response
  from extensions.http((
    'GET'::extensions.http_method,
    'https://oxtbskojiexkaspputvo.supabase.co/rest/v1/user_roles?select=role&role=eq.organizer&limit=1'::varchar,
    array[
      extensions.http_header('apikey', 'sb_publishable_HlFRpOFUHzotkO609JPXgQ_ZWi8DSCj'),
      extensions.http_header('Authorization', 'Bearer ' || access_token),
      extensions.http_header('Accept', 'application/json')
    ]::extensions.http_header[],
    null::varchar,
    null::varchar
  )::extensions.http_request);

  if response.status <> 200 then
    return false;
  end if;

  response_json := coalesce(nullif(response.content, ''), '[]')::jsonb;
  return jsonb_typeof(response_json) = 'array'
    and jsonb_array_length(response_json) > 0;
exception
  when others then
    return false;
end;
$$;

revoke all on function public.is_solaris_organizer_request() from public;

-- Narrow public read model used by the merged Confirmations landing page.
create or replace function public.public_confirmation_rounds()
returns table (
  id uuid,
  name text,
  status text,
  opens_at timestamptz,
  closes_at timestamptz,
  response_limit integer,
  response_count integer,
  edition_id uuid,
  edition_name text,
  edition_number integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.status,
    r.opens_at,
    r.closes_at,
    r.response_limit,
    coalesce(s.submitted_count, 0)::integer as response_count,
    e.id as edition_id,
    e.name as edition_name,
    e.edition_number
  from public.editions e
  join public.submission_rounds r on r.edition_id = e.id
  left join public.round_stats s on s.round_id = r.id
  where e.status = 'active'
    and r.status <> 'draft'
  order by e.edition_number desc, r.created_at asc;
$$;

revoke all on function public.public_confirmation_rounds() from public;
grant execute on function public.public_confirmation_rounds() to anon, authenticated;

-- Existing admin RPCs keep legacy Confirmations admin access AND additionally
-- accept a verified Solaris organizer. Merged calls enter through the anon API
-- role because a Solaris JWT belongs to a different Supabase project, so anon
-- needs EXECUTE permission to reach the internal guard. The guard itself remains
-- mandatory and was tested to reject a plain anonymous request.
do $$
declare
  fn record;
  ddl text;
begin
  for fn in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.proname like 'admin_confirmation_%'
        or p.proname in (
          'admin_review_confirmation_entry',
          'admin_set_confirmation_winner',
          'admin_update_confirmation_controls'
        )
      )
  loop
    ddl := pg_get_functiondef(fn.oid);

    ddl := replace(
      ddl,
      'if auth.uid() is null or not public.has_role(auth.uid(), ''admin''::public.app_role) then',
      'if not ((auth.uid() is not null and public.has_role(auth.uid(), ''admin''::public.app_role)) or public.is_solaris_organizer_request()) then'
    );

    ddl := replace(
      ddl,
      'if not public.is_solaris_organizer_request() then',
      'if not ((auth.uid() is not null and public.has_role(auth.uid(), ''admin''::public.app_role)) or public.is_solaris_organizer_request()) then'
    );

    execute ddl;
    execute format('grant execute on function %s to anon', fn.oid::regprocedure);
  end loop;
end
$$;

notify pgrst, 'reload schema';
