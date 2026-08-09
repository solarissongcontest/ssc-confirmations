-- ============================================================
-- NEXT IN LINE
-- Separate from normal confirmation submissions.
-- ============================================================

create table if not exists public.next_in_line_submissions (
  id uuid primary key default gen_random_uuid(),

  edition_id uuid not null
    references public.editions(id)
    on delete cascade,

  source_submission_id uuid not null
    references public.submissions(id)
    on delete cascade,

  country text not null,

  participating boolean not null default true,

  entry_unknown boolean not null default false,

  selection_type text not null
    check (
      selection_type in (
        'none',
        'unknown',
        'internal',
        'national_final'
      )
    ),

  national_final_entry_id uuid
    references public.national_final_entries(id)
    on delete set null,

  artist text,
  song_title text,
  song_url text,

  preview_start text,
  preview_end text,

  submitted_at timestamptz not null default now()
);

create unique index if not exists
  next_in_line_edition_country_unique
on public.next_in_line_submissions (
  edition_id,
  lower(country)
);

grant select, insert, update, delete
on public.next_in_line_submissions
to authenticated;

grant all
on public.next_in_line_submissions
to service_role;

alter table public.next_in_line_submissions
enable row level security;

drop policy if exists
  "next in line admin"
on public.next_in_line_submissions;

create policy "next in line admin"
on public.next_in_line_submissions
for all
to authenticated
using (
  public.has_role(
    auth.uid(),
    'admin'
  )
)
with check (
  public.has_role(
    auth.uid(),
    'admin'
  )
);

-- ============================================================
-- UPDATE DUPLICATE CHECK
--
-- Normal entries + internal Next in Line entries use the
-- same repetition rules:
--
-- SONG:
-- blocked globally
--
-- ARTIST:
-- blocked within the same edition
-- ============================================================

create or replace function public.find_entry_duplicate(
  _edition_id uuid,
  _submission_id uuid,
  _artist text,
  _song_title text,
  _song_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_artist text;
  normalized_song text;
  normalized_url text;
  hit record;
begin

  normalized_artist :=
    public.normalize_entry_text(
      _artist
    );

  normalized_song :=
    public.normalize_entry_text(
      _song_title
    );

  normalized_url :=
    lower(
      trim(
        coalesce(
          _song_url,
          ''
        )
      )
    );

  if
    normalized_artist = ''
    and normalized_song = ''
    and normalized_url = ''
  then
    return jsonb_build_object(
      'duplicate',
      false
    );
  end if;

  -- ==========================================================
  -- GLOBAL SONG CHECK:
  -- INTERNAL ENTRIES
  -- ==========================================================

  select
    s.id as submission_id
  into hit
  from public.internal_entries i
  join public.submissions s
    on s.id = i.submission_id
  where
    s.id <> _submission_id
    and (
      (
        normalized_artist <> ''
        and normalized_song <> ''
        and public.normalize_entry_text(
          i.artist
        ) = normalized_artist
        and public.normalize_entry_text(
          i.song_title
        ) = normalized_song
      )
      or
      (
        normalized_url <> ''
        and lower(
          trim(
            coalesce(
              i.song_url,
              ''
            )
          )
        ) = normalized_url
      )
    )
  limit 1;

  if found then
    return jsonb_build_object(
      'duplicate',
      true,
      'type',
      'song'
    );
  end if;

  -- ==========================================================
  -- GLOBAL SONG CHECK:
  -- NATIONAL FINAL ENTRIES
  -- ==========================================================

  select
    s.id as submission_id
  into hit
  from public.national_final_entries e
  join public.national_finals nf
    on nf.id =
      e.national_final_id
  join public.submissions s
    on s.id =
      nf.submission_id
  where
    s.id <> _submission_id
    and (
      (
        normalized_artist <> ''
        and normalized_song <> ''
        and public.normalize_entry_text(
          e.artist
        ) = normalized_artist
        and public.normalize_entry_text(
          e.song_title
        ) = normalized_song
      )
      or
      (
        normalized_url <> ''
        and lower(
          trim(
            coalesce(
              e.song_url,
              ''
            )
          )
        ) = normalized_url
      )
    )
  limit 1;

  if found then
    return jsonb_build_object(
      'duplicate',
      true,
      'type',
      'song'
    );
  end if;

  -- ==========================================================
  -- GLOBAL SONG CHECK:
  -- INTERNAL NEXT IN LINE ENTRIES
  -- ==========================================================

  select
    n.id
  into hit
  from public.next_in_line_submissions n
  where
    n.participating = true
    and n.entry_unknown = false
    and n.selection_type =
      'internal'
    and (
      (
        normalized_artist <> ''
        and normalized_song <> ''
        and public.normalize_entry_text(
          n.artist
        ) = normalized_artist
        and public.normalize_entry_text(
          n.song_title
        ) = normalized_song
      )
      or
      (
        normalized_url <> ''
        and lower(
          trim(
            coalesce(
              n.song_url,
              ''
            )
          )
        ) = normalized_url
      )
    )
  limit 1;

  if found then
    return jsonb_build_object(
      'duplicate',
      true,
      'type',
      'song'
    );
  end if;

  -- ==========================================================
  -- ARTIST CHECK:
  -- NORMAL SUBMISSIONS
  -- SAME EDITION ONLY
  -- ==========================================================

  select
    s.id
  into hit
  from public.submissions s

  left join public.internal_entries i
    on i.submission_id =
      s.id

  left join public.national_finals nf
    on nf.submission_id =
      s.id

  left join public.national_final_entries e
    on e.national_final_id =
      nf.id

  where
    s.edition_id =
      _edition_id

    and s.id <>
      _submission_id

    and normalized_artist <>
      ''

    and (
      public.normalize_entry_text(
        i.artist
      ) = normalized_artist

      or

      public.normalize_entry_text(
        e.artist
      ) = normalized_artist
    )

  limit 1;

  if found then
    return jsonb_build_object(
      'duplicate',
      true,
      'type',
      'artist'
    );
  end if;

  -- ==========================================================
  -- ARTIST CHECK:
  -- NEXT IN LINE INTERNAL ENTRIES
  -- SAME EDITION ONLY
  -- ==========================================================

  select
    n.id
  into hit
  from public.next_in_line_submissions n
  where
    n.edition_id =
      _edition_id

    and n.participating =
      true

    and n.entry_unknown =
      false

    and n.selection_type =
      'internal'

    and normalized_artist <>
      ''

    and public.normalize_entry_text(
      n.artist
    ) = normalized_artist

  limit 1;

  if found then
    return jsonb_build_object(
      'duplicate',
      true,
      'type',
      'artist'
    );
  end if;

  return jsonb_build_object(
    'duplicate',
    false
  );

end;
$$;

revoke all
on function public.find_entry_duplicate(
  uuid,
  uuid,
  text,
  text,
  text
)
from public;

grant execute
on function public.find_entry_duplicate(
  uuid,
  uuid,
  text,
  text,
  text
)
to service_role;

-- ============================================================
-- PUBLIC:
-- GET COUNTRIES FOR ACTIVE EDITION
-- ============================================================

create or replace function public.public_next_in_line_countries()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_edition public.editions;
begin

  select *
  into active_edition
  from public.editions
  where status = 'active'
  order by edition_number desc
  limit 1;

  if active_edition is null then
    return jsonb_build_object(
      'ok',
      false,

      'error',
      'no_active_edition',

      'countries',
      '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'ok',
    true,

    'edition',
    jsonb_build_object(
      'id',
      active_edition.id,

      'name',
      active_edition.name,

      'edition_number',
      active_edition.edition_number
    ),

    'countries',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'country',
            x.country
          )
          order by x.country
        )
        from (
          select distinct on (
            lower(s.country)
          )
            s.country

          from public.submissions s

          where
            s.edition_id =
              active_edition.id

            and s.participating =
              true

          order by
            lower(s.country),
            s.submitted_at desc
        ) x
      ),
      '[]'::jsonb
    )
  );

end;
$$;

revoke all
on function public.public_next_in_line_countries()
from public;

grant execute
on function public.public_next_in_line_countries()
to anon, authenticated, service_role;

-- ============================================================
-- PUBLIC:
-- GET ONE COUNTRY + ITS NF ENTRIES
-- ============================================================

create or replace function public.public_next_in_line_country(
  _edition_id uuid,
  _country text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.submissions;
  nf public.national_finals;
begin

  select *
  into s
  from public.submissions
  where
    edition_id =
      _edition_id

    and lower(country) =
      lower(
        trim(
          _country
        )
      )

    and participating =
      true

  order by
    submitted_at desc

  limit 1;

  if s is null then
    return jsonb_build_object(
      'ok',
      false,

      'error',
      'country_not_found'
    );
  end if;

  if s.selection_method =
    'national_final'
  then

    select *
    into nf
    from public.national_finals
    where
      submission_id =
        s.id
    limit 1;

    return jsonb_build_object(
      'ok',
      true,

      'submission_id',
      s.id,

      'country',
      s.country,

      'selection_method',
      'national_final',

      'entries',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
              e.id,

              'artist',
              e.artist,

              'song_title',
              e.song_title,

              'song_url',
              e.song_url,

              'position',
              e.position
            )
            order by e.position
          )
          from public.national_final_entries e
          where
            e.national_final_id =
              nf.id
        ),
        '[]'::jsonb
      )
    );

  end if;

  return jsonb_build_object(
    'ok',
    true,

    'submission_id',
    s.id,

    'country',
    s.country,

    'selection_method',
    coalesce(
      s.selection_method,
      'unknown'
    ),

    'entries',
    '[]'::jsonb
  );

end;
$$;

revoke all
on function public.public_next_in_line_country(
  uuid,
  text
)
from public;

grant execute
on function public.public_next_in_line_country(
  uuid,
  text
)
to anon, authenticated, service_role;

-- ============================================================
-- PUBLIC:
-- SUBMIT NEXT IN LINE FORM
-- ============================================================

create or replace function public.submit_next_in_line(
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_edition public.editions;

  s public.submissions;

  selected_nf_entry
    public.national_final_entries;

  duplicate_result jsonb;

  wants_to_participate boolean :=
    coalesce(
      (
        payload->>
          'participating'
      )::boolean,
      false
    );

  entry_is_unknown boolean :=
    coalesce(
      (
        payload->>
          'entry_unknown'
      )::boolean,
      false
    );

  chosen_type text :=
    nullif(
      payload->>
        'selection_type',
      ''
    );

  artist_value text :=
    nullif(
      trim(
        payload->>
          'artist'
      ),
      ''
    );

  song_value text :=
    nullif(
      trim(
        payload->>
          'song_title'
      ),
      ''
    );

  url_value text :=
    nullif(
      trim(
        payload->>
          'song_url'
      ),
      ''
    );

  preview_start_value text :=
    nullif(
      trim(
        payload->>
          'preview_start'
      ),
      ''
    );

  preview_end_value text :=
    nullif(
      trim(
        payload->>
          'preview_end'
      ),
      ''
    );

begin

  select *
  into active_edition
  from public.editions
  where
    id =
      (
        payload->>
          'edition_id'
      )::uuid

    and status =
      'active';

  if active_edition is null then
    return jsonb_build_object(
      'ok',
      false,

      'error',
      'edition_closed'
    );
  end if;

  select *
  into s
  from public.submissions
  where
    id =
      (
        payload->>
          'source_submission_id'
      )::uuid

    and edition_id =
      active_edition.id

    and lower(country) =
      lower(
        trim(
          payload->>
            'country'
        )
      )

    and participating =
      true

  limit 1;

  if s is null then
    return jsonb_build_object(
      'ok',
      false,

      'error',
      'invalid_country'
    );
  end if;

  if exists (
    select 1
    from public.next_in_line_submissions n
    where
      n.edition_id =
        active_edition.id

      and lower(
        n.country
      ) =
        lower(
          s.country
        )
  ) then
    return jsonb_build_object(
      'ok',
      false,

      'error',
      'already_submitted'
    );
  end if;

  -- ==========================================================
  -- NO
  -- ==========================================================

  if not wants_to_participate then

    insert into public.next_in_line_submissions (
      edition_id,
      source_submission_id,
      country,
      participating,
      entry_unknown,
      selection_type
    )
    values (
      active_edition.id,
      s.id,
      s.country,
      false,
      true,
      'none'
    );

    return jsonb_build_object(
      'ok',
      true
    );

  end if;

  -- ==========================================================
  -- YES, BUT ENTRY UNKNOWN
  -- ==========================================================

  if entry_is_unknown then

    insert into public.next_in_line_submissions (
      edition_id,
      source_submission_id,
      country,
      participating,
      entry_unknown,
      selection_type
    )
    values (
      active_edition.id,
      s.id,
      s.country,
      true,
      true,
      'unknown'
    );

    return jsonb_build_object(
      'ok',
      true
    );

  end if;

  -- ==========================================================
  -- NATIONAL FINAL ENTRY
  -- ==========================================================

  if chosen_type =
    'national_final'
  then

    select e.*
    into selected_nf_entry
    from public.national_final_entries e

    join public.national_finals nf
      on nf.id =
        e.national_final_id

    where
      e.id =
        (
          payload->>
            'national_final_entry_id'
        )::uuid

      and nf.submission_id =
        s.id

    limit 1;

    if selected_nf_entry is null then
      return jsonb_build_object(
        'ok',
        false,

        'error',
        'invalid_nf_entry'
      );
    end if;

    if preview_start_value is null then
      return jsonb_build_object(
        'ok',
        false,

        'error',
        'preview_required'
      );
    end if;

    insert into public.next_in_line_submissions (
      edition_id,
      source_submission_id,
      country,

      participating,
      entry_unknown,
      selection_type,

      national_final_entry_id,

      artist,
      song_title,
      song_url,

      preview_start,
      preview_end
    )
    values (
      active_edition.id,
      s.id,
      s.country,

      true,
      false,
      'national_final',

      selected_nf_entry.id,

      selected_nf_entry.artist,
      selected_nf_entry.song_title,
      selected_nf_entry.song_url,

      preview_start_value,
      preview_end_value
    );

    return jsonb_build_object(
      'ok',
      true
    );

  end if;

  -- ==========================================================
  -- INTERNAL ENTRY
  -- ==========================================================

  if chosen_type =
    'internal'
  then

    if
      artist_value is null
      or song_value is null
      or url_value is null
    then
      return jsonb_build_object(
        'ok',
        false,

        'error',
        'entry_required'
      );
    end if;

    if preview_start_value is null then
      return jsonb_build_object(
        'ok',
        false,

        'error',
        'preview_required'
      );
    end if;

    duplicate_result :=
      public.find_entry_duplicate(
        active_edition.id,

        '00000000-0000-0000-0000-000000000000'
          ::uuid,

        artist_value,
        song_value,
        url_value
      );

    if coalesce(
      (
        duplicate_result->
          'duplicate'
      )::boolean,
      false
    ) then

      if
        duplicate_result->>
          'type'
        =
          'artist'
      then

        return jsonb_build_object(
          'ok',
          false,

          'error',
          'duplicate_artist'
        );

      end if;

      return jsonb_build_object(
        'ok',
        false,

        'error',
        'duplicate_song'
      );

    end if;

    insert into public.next_in_line_submissions (
      edition_id,
      source_submission_id,
      country,

      participating,
      entry_unknown,
      selection_type,

      artist,
      song_title,
      song_url,

      preview_start,
      preview_end
    )
    values (
      active_edition.id,
      s.id,
      s.country,

      true,
      false,
      'internal',

      artist_value,
      song_value,
      url_value,

      preview_start_value,
      preview_end_value
    );

    return jsonb_build_object(
      'ok',
      true
    );

  end if;

  return jsonb_build_object(
    'ok',
    false,

    'error',
    'invalid_selection'
  );

end;
$$;

revoke all
on function public.submit_next_in_line(
  jsonb
)
from public;

grant execute
on function public.submit_next_in_line(
  jsonb
)
to anon, authenticated, service_role;
