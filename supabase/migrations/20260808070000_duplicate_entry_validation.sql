create or replace function public.normalize_entry_text(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(trim(coalesce(value, ''))),
    '[[:space:][:punct:]]+',
    '',
    'g'
  );
$$;


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

  normalized_artist := public.normalize_entry_text(_artist);
  normalized_song := public.normalize_entry_text(_song_title);
  normalized_url := lower(trim(coalesce(_song_url, '')));

  if normalized_artist = ''
     and normalized_song = ''
     and normalized_url = ''
  then
    return jsonb_build_object(
      'duplicate', false
    );
  end if;


  -- ============================================================
  -- GLOBAL SONG CHECK
  --
  -- A song cannot be reused in ANY edition.
  -- Match by:
  --   1. normalized artist + normalized song title
  --   2. exact normalized song URL
  --
  -- This checks internal selections.
  -- ============================================================

  select
    s.id as submission_id,
    i.artist,
    i.song_title,
    i.song_url
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
        and public.normalize_entry_text(i.artist) = normalized_artist
        and public.normalize_entry_text(i.song_title) = normalized_song
      )
      or
      (
        normalized_url <> ''
        and lower(trim(coalesce(i.song_url, ''))) = normalized_url
      )
    )
  limit 1;


  if found then
    return jsonb_build_object(
      'duplicate', true,
      'type', 'song'
    );
  end if;


  -- ============================================================
  -- GLOBAL SONG CHECK
  --
  -- Same rule for national-final entries.
  -- ============================================================

  select
    s.id as submission_id,
    e.artist,
    e.song_title,
    e.song_url
  into hit
  from public.national_final_entries e
  join public.national_finals nf
    on nf.id = e.national_final_id
  join public.submissions s
    on s.id = nf.submission_id
  where
    s.id <> _submission_id
    and (
      (
        normalized_artist <> ''
        and normalized_song <> ''
        and public.normalize_entry_text(e.artist) = normalized_artist
        and public.normalize_entry_text(e.song_title) = normalized_song
      )
      or
      (
        normalized_url <> ''
        and lower(trim(coalesce(e.song_url, ''))) = normalized_url
      )
    )
  limit 1;


  if found then
    return jsonb_build_object(
      'duplicate', true,
      'type', 'song'
    );
  end if;


  -- ============================================================
  -- ARTIST-ONLY CHECK
  --
  -- Artists are only blocked within the SAME edition.
  -- They may return in future editions with another song.
  -- ============================================================

  select
    s.id as submission_id
  into hit
  from public.submissions s
  left join public.internal_entries i
    on i.submission_id = s.id
  left join public.national_finals nf
    on nf.submission_id = s.id
  left join public.national_final_entries e
    on e.national_final_id = nf.id
  where
    s.edition_id = _edition_id
    and s.id <> _submission_id
    and normalized_artist <> ''
    and (
      public.normalize_entry_text(i.artist) = normalized_artist
      or public.normalize_entry_text(e.artist) = normalized_artist
    )
  limit 1;


  if found then
    return jsonb_build_object(
      'duplicate', true,
      'type', 'artist'
    );
  end if;


  return jsonb_build_object(
    'duplicate', false
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
