-- ============================================================
-- HARD DATABASE ENFORCEMENT FOR SSC ENTRY UNIQUENESS
--
-- RULES:
--
-- 1. A SONG may only appear once across ALL SSC editions.
--    A song is considered the same when:
--      - normalized artist + normalized song title match
--      OR
--      - the same song URL is used
--
-- 2. An ARTIST may only appear once inside the SAME edition.
--    The artist may return in a later edition.
--
-- 3. Checks include:
--      - internal selections
--      - national final entries
--      - different countries
--      - different submission rounds
--      - entries inside the same National Final
--      - admin/database edits
--
-- 4. Advisory transaction locks prevent two people submitting
--    the same entry at almost exactly the same time.
-- ============================================================


-- ============================================================
-- TEXT NORMALISATION
-- ============================================================

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


-- ============================================================
-- HARD ENTRY VALIDATION TRIGGER
-- ============================================================

create or replace function public.enforce_entry_uniqueness()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_submission_id uuid;
  current_edition_id uuid;

  normalized_artist text;
  normalized_song text;
  normalized_url text;

  duplicate_found boolean;
begin

  -- ----------------------------------------------------------
  -- WORK OUT WHICH SUBMISSION / EDITION THIS ENTRY BELONGS TO
  -- ----------------------------------------------------------

  if TG_TABLE_NAME = 'internal_entries' then

    select
      s.id,
      s.edition_id
    into
      current_submission_id,
      current_edition_id
    from public.submissions s
    where s.id = NEW.submission_id;

  elsif TG_TABLE_NAME = 'national_final_entries' then

    select
      s.id,
      s.edition_id
    into
      current_submission_id,
      current_edition_id
    from public.national_finals nf
    join public.submissions s
      on s.id = nf.submission_id
    where nf.id = NEW.national_final_id;

  else

    raise exception 'Unsupported entry table';

  end if;


  if current_submission_id is null
     or current_edition_id is null
  then
    raise exception 'Entry submission could not be resolved';
  end if;


  normalized_artist :=
    public.normalize_entry_text(NEW.artist);

  normalized_song :=
    public.normalize_entry_text(NEW.song_title);

  normalized_url :=
    lower(trim(coalesce(NEW.song_url, '')));


  -- ==========================================================
  -- TRANSACTION LOCKS
  --
  -- These stop two simultaneous submissions from both passing
  -- the duplicate check before either one commits.
  -- ==========================================================

  if normalized_artist <> ''
     and normalized_song <> ''
  then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'ssc-song:' ||
        normalized_artist ||
        ':' ||
        normalized_song,
        0
      )
    );
  end if;


  if normalized_url <> '' then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'ssc-url:' ||
        normalized_url,
        0
      )
    );
  end if;


  if normalized_artist <> '' then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'ssc-artist-edition:' ||
        current_edition_id::text ||
        ':' ||
        normalized_artist,
        0
      )
    );
  end if;


  -- ==========================================================
  -- GLOBAL SONG CHECK AGAINST INTERNAL SELECTIONS
  -- ==========================================================

  duplicate_found := false;

  if normalized_song <> ''
     and normalized_artist <> ''
  then

    select exists (
      select 1
      from public.internal_entries i
      join public.submissions s
        on s.id = i.submission_id
      where
        public.normalize_entry_text(i.artist)
          = normalized_artist

        and public.normalize_entry_text(i.song_title)
          = normalized_song

        and not (
          TG_TABLE_NAME = 'internal_entries'
          and i.id = NEW.id
        )
    )
    into duplicate_found;

  end if;


  if not duplicate_found
     and normalized_url <> ''
  then

    select exists (
      select 1
      from public.internal_entries i
      where
        lower(trim(coalesce(i.song_url, '')))
          = normalized_url

        and not (
          TG_TABLE_NAME = 'internal_entries'
          and i.id = NEW.id
        )
    )
    into duplicate_found;

  end if;


  if duplicate_found then
    raise exception 'duplicate_song';
  end if;


  -- ==========================================================
  -- GLOBAL SONG CHECK AGAINST NATIONAL FINAL ENTRIES
  -- ==========================================================

  duplicate_found := false;

  if normalized_song <> ''
     and normalized_artist <> ''
  then

    select exists (
      select 1
      from public.national_final_entries e
      where
        public.normalize_entry_text(e.artist)
          = normalized_artist

        and public.normalize_entry_text(e.song_title)
          = normalized_song

        and not (
          TG_TABLE_NAME = 'national_final_entries'
          and e.id = NEW.id
        )
    )
    into duplicate_found;

  end if;


  if not duplicate_found
     and normalized_url <> ''
  then

    select exists (
      select 1
      from public.national_final_entries e
      where
        lower(trim(coalesce(e.song_url, '')))
          = normalized_url

        and not (
          TG_TABLE_NAME = 'national_final_entries'
          and e.id = NEW.id
        )
    )
    into duplicate_found;

  end if;


  if duplicate_found then
    raise exception 'duplicate_song';
  end if;


  -- ==========================================================
  -- ARTIST CHECK
  --
  -- Artist duplication is forbidden only inside THIS edition.
  -- ==========================================================

  if normalized_artist <> '' then

    -- --------------------------------------------------------
    -- INTERNAL SELECTION ARTISTS
    -- --------------------------------------------------------

    select exists (
      select 1
      from public.internal_entries i
      join public.submissions s
        on s.id = i.submission_id
      where
        s.edition_id = current_edition_id

        and public.normalize_entry_text(i.artist)
          = normalized_artist

        and not (
          TG_TABLE_NAME = 'internal_entries'
          and i.id = NEW.id
        )
    )
    into duplicate_found;


    if duplicate_found then
      raise exception 'duplicate_artist';
    end if;


    -- --------------------------------------------------------
    -- NATIONAL FINAL ARTISTS
    -- --------------------------------------------------------

    select exists (
      select 1
      from public.national_final_entries e
      join public.national_finals nf
        on nf.id = e.national_final_id
      join public.submissions s
        on s.id = nf.submission_id
      where
        s.edition_id = current_edition_id

        and public.normalize_entry_text(e.artist)
          = normalized_artist

        and not (
          TG_TABLE_NAME = 'national_final_entries'
          and e.id = NEW.id
        )
    )
    into duplicate_found;


    if duplicate_found then
      raise exception 'duplicate_artist';
    end if;

  end if;


  return NEW;

end;
$$;


-- ============================================================
-- INSTALL TRIGGERS
-- ============================================================

drop trigger if exists enforce_internal_entry_uniqueness
on public.internal_entries;

create trigger enforce_internal_entry_uniqueness
before insert or update of artist, song_title, song_url
on public.internal_entries
for each row
execute function public.enforce_entry_uniqueness();


drop trigger if exists enforce_nf_entry_uniqueness
on public.national_final_entries;

create trigger enforce_nf_entry_uniqueness
before insert or update of artist, song_title, song_url
on public.national_final_entries
for each row
execute function public.enforce_entry_uniqueness();
