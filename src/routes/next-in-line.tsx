import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
} from "lucide-react";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Switch,
} from "@/components/ui/switch";

import {
  getNextInLineCountries,
  getNextInLineCountry,
  submitNextInLine,
  checkEntryDuplicate,
  type NextInLineEdition,
  type NextInLineNfEntry,
} from "@/lib/public.functions";

import {
  isValidUrl,
  offsetTimestamp,
  parseTimestamp,
} from "@/lib/ssc";

export const Route =
  createFileRoute(
    "/next-in-line",
  )({
    component:
      NextInLinePage,
  });

type DuplicateType =
  | "song"
  | "artist"
  | null;

function NextInLinePage() {
  const loadCountries =
    useServerFn(
      getNextInLineCountries,
    );

  const loadCountry =
    useServerFn(
      getNextInLineCountry,
    );

  const submit =
    useServerFn(
      submitNextInLine,
    );

  const checkDuplicate =
    useServerFn(
      checkEntryDuplicate,
    );

  const [
    edition,
    setEdition,
  ] =
    useState<
      NextInLineEdition | null
    >(null);

  const [
    countries,
    setCountries,
  ] =
    useState<string[]>([]);

  const [
    country,
    setCountry,
  ] =
    useState("");

  const [
    sourceSubmissionId,
    setSourceSubmissionId,
  ] =
    useState("");

  const [
    originalMethod,
    setOriginalMethod,
  ] =
    useState<
      | "internal"
      | "national_final"
      | "unknown"
      | null
    >(null);

  const [
    nfEntries,
    setNfEntries,
  ] =
    useState<
      NextInLineNfEntry[]
    >([]);

  const [
    selectedNfEntry,
    setSelectedNfEntry,
  ] =
    useState("");

  const [
    entryUnknown,
    setEntryUnknown,
  ] =
    useState(false);

  const [
    artist,
    setArtist,
  ] =
    useState("");

  const [
    songTitle,
    setSongTitle,
  ] =
    useState("");

  const [
    songUrl,
    setSongUrl,
  ] =
    useState("");

  const [
    previewStart,
    setPreviewStart,
  ] =
    useState("");

  const [
    duplicate,
    setDuplicate,
  ] =
    useState<DuplicateType>(
      null,
    );

  const [
    checking,
    setChecking,
  ] =
    useState(false);

  const [
    loadingCountry,
    setLoadingCountry,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    done,
    setDone,
  ] =
    useState(false);

  const previewEnd =
    useMemo(
      () =>
        offsetTimestamp(
          previewStart,
          25,
        ),
      [previewStart],
    );

  useEffect(() => {
    void (async () => {
      try {
        const result =
          await loadCountries();

        if (
          !result.ok ||
          !result.edition
        ) {
          setError(
            "There is no active Solaris Song Contest edition.",
          );

          return;
        }

        setEdition(
          result.edition,
        );

        setCountries(
          result.countries.map(
            (item) =>
              item.country,
          ),
        );
      } catch {
        setError(
          "The Next in Line form could not be loaded.",
        );
      }
    })();
  }, [loadCountries]);

  async function chooseCountry(
    value: string,
  ) {
    setCountry(value);

    setSourceSubmissionId(
      "",
    );

    setOriginalMethod(
      null,
    );

    setNfEntries([]);

    setSelectedNfEntry(
      "",
    );

    setEntryUnknown(
      false,
    );

    setArtist("");

    setSongTitle("");

    setSongUrl("");

    setPreviewStart("");

    setDuplicate(null);

    setError(null);

    if (
      !edition ||
      !value
    ) {
      return;
    }

    setLoadingCountry(
      true,
    );

    try {
      const result =
        await loadCountry({
          data: {
            edition_id:
              edition.id,

            country:
              value,
          },
        });

      if (
        !result.ok ||
        !result.submission_id
      ) {
        setError(
          "That country could not be loaded.",
        );

        return;
      }

      setSourceSubmissionId(
        result.submission_id,
      );

      setOriginalMethod(
        result.selection_method ??
          "unknown",
      );

      setNfEntries(
        result.entries ??
          [],
      );
    } catch {
      setError(
        "That country's entry information could not be loaded.",
      );
    } finally {
      setLoadingCountry(
        false,
      );
    }
  }

  /*
   * Instant duplicate check is
   * needed only for a NEW internal
   * Next in Line song.
   *
   * NF songs are existing submitted
   * NF entries, so selecting one must
   * not accuse itself of being a
   * duplicate. Software can be
   * dramatic enough already.
   */
  useEffect(() => {
    if (
      originalMethod ===
        "national_final" ||
      entryUnknown ||
      !edition
    ) {
      setDuplicate(
        null,
      );

      return;
    }

    const a =
      artist.trim();

    const s =
      songTitle.trim();

    const u =
      songUrl.trim();

    if (
      !a &&
      !s &&
      !u
    ) {
      setDuplicate(
        null,
      );

      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        async () => {
          setChecking(true);

          try {
            const result =
              await checkDuplicate({
                data: {
                  edition_id:
                    edition.id,

                  artist: a,

                  song_title:
                    s,

                  song_url:
                    u,
                },
              });

            if (
              !cancelled
            ) {
              setDuplicate(
                result.ok &&
                  result
                    .duplicate
                  ? result.type
                  : null,
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setChecking(
                false,
              );
            }
          }
        },
        500,
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timer,
      );
    };
  }, [
    artist,
    songTitle,
    songUrl,
    originalMethod,
    entryUnknown,
    edition,
    checkDuplicate,
  ]);

  function duplicateText() {
    if (
      duplicate ===
      "song"
    ) {
      return "This song has already been used in Solaris Song Contest and cannot be submitted again.";
    }

    if (
      duplicate ===
      "artist"
    ) {
      return "This artist has already been submitted for another country in this edition.";
    }

    return null;
  }

  async function send() {
    setError(null);

    if (
      !edition ||
      !country ||
      !sourceSubmissionId
    ) {
      setError(
        "Choose your country first.",
      );

      return;
    }

    if (
      entryUnknown
    ) {
      setBusy(true);

      try {
        const result =
          await submit({
            data: {
              edition_id:
                edition.id,

              source_submission_id:
                sourceSubmissionId,

              country,

              selection_type:
                "unknown",

              entry_unknown:
                true,

              artist: "",

              song_title: "",

              song_url: "",

              preview_start: "",

              preview_end: "",
            },
          });

        if (
          result.ok
        ) {
          setDone(true);
        } else {
          setError(
            errorMessage(
              result.error,
            ),
          );
        }
      } finally {
        setBusy(false);
      }

      return;
    }

    let selectionType:
      | "national_final"
      | "internal";

    let finalArtist =
      artist;

    let finalSong =
      songTitle;

    let finalUrl =
      songUrl;

    if (
      originalMethod ===
      "national_final"
    ) {
      selectionType =
        "national_final";

      const selected =
        nfEntries.find(
          (entry) =>
            entry.id ===
            selectedNfEntry,
        );

      if (!selected) {
        setError(
          "Choose one of your National Final entries.",
        );

        return;
      }

      finalArtist =
        selected.artist ??
        "";

      finalSong =
        selected.song_title ??
        "";

      finalUrl =
        selected.song_url ??
        "";
    } else {
      selectionType =
        "internal";

      if (
        !artist.trim() ||
        !songTitle.trim()
      ) {
        setError(
          "Artist and song title are required.",
        );

        return;
      }

      if (
        !songUrl.trim() ||
        !isValidUrl(
          songUrl,
        )
      ) {
        setError(
          "Enter a valid song link starting with https://",
        );

        return;
      }

      if (
        duplicate
      ) {
        setError(
          duplicateText(),
        );

        return;
      }
    }

    if (
      parseTimestamp(
        previewStart,
      ) === null
    ) {
      setError(
        "Enter the 25-second preview start as MM:SS, for example 01:12.",
      );

      return;
    }

    setBusy(true);

    try {
      const result =
        await submit({
          data: {
            edition_id:
              edition.id,

            source_submission_id:
              sourceSubmissionId,

            country,

            selection_type:
              selectionType,

            entry_unknown:
              false,

            national_final_entry_id:
              selectionType ===
                "national_final"
                ? selectedNfEntry
                : null,

            artist:
              finalArtist,

            song_title:
              finalSong,

            song_url:
              finalUrl,

            preview_start:
              previewStart,

            preview_end:
              previewEnd,
          },
        });

      if (
        result.ok
      ) {
        setDone(true);
      } else {
        setError(
          errorMessage(
            result.error,
          ),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-12">
        <div className="surface p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-6" />
          </div>

          <h1 className="mt-4 text-2xl font-semibold">
            Next in Line submitted
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your response for{" "}
            {country} has been
            received.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-solar text-4xl font-normal sm:text-5xl">
          Next in Line
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Submit the entry your country would use if a place becomes available.
        </p>

        {edition ? (
          <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
            {edition.name}
          </p>
        ) : null}
      </header>

      <div className="surface space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <Label>
            Country
          </Label>

          <select
            value={country}
            onChange={(event) =>
              void chooseCountry(
                event.target
                  .value,
              )
            }
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">
              Choose country
            </option>

            {countries.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </div>

        {loadingCountry ? (
          <p className="text-sm text-muted-foreground">
            Loading country…
          </p>
        ) : null}

        {sourceSubmissionId ? (
          <>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <span className="text-sm">
                I don't know my
                Next in Line entry
                yet
              </span>

              <Switch
                checked={
                  entryUnknown
                }
                onCheckedChange={
                  setEntryUnknown
                }
              />
            </label>

            {!entryUnknown &&
            originalMethod ===
              "national_final" ? (
              <div className="space-y-3">
                <Label>
                  Choose your entry
                </Label>

                {nfEntries.length >
                0 ? (
                  nfEntries.map(
                    (entry) => (
                      <button
                        key={
                          entry.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedNfEntry(
                            entry.id,
                          )
                        }
                        className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                          selectedNfEntry ===
                          entry.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/30"
                        }`}
                      >
                        <p className="text-sm font-medium">
                          {entry.artist ||
                            "Unknown artist"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.song_title ||
                            "Unknown song"}
                        </p>
                      </button>
                    ),
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No National
                    Final entries
                    were submitted
                    for this country.
                  </p>
                )}
              </div>
            ) : null}

            {!entryUnknown &&
            originalMethod !==
              "national_final" ? (
              <>
                <div className="space-y-2">
                  <Label>
                    Artist
                  </Label>

                  <Input
                    value={artist}
                    onChange={(e) =>
                      setArtist(
                        e.target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Song title
                  </Label>

                  <Input
                    value={
                      songTitle
                    }
                    onChange={(e) =>
                      setSongTitle(
                        e.target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Song link
                  </Label>

                  <Input
                    value={
                      songUrl
                    }
                    onChange={(e) =>
                      setSongUrl(
                        e.target
                          .value,
                      )
                    }
                    placeholder="https://"
                  />
                </div>

                {checking ? (
                  <p className="text-xs text-muted-foreground">
                    Checking entry…
                  </p>
                ) : duplicate ? (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                    {
                      duplicateText()
                    }
                  </p>
                ) : null}
              </>
            ) : null}

            {!entryUnknown ? (
              <div className="space-y-2">
                <Label>
                  25-second preview
                  start
                </Label>

                <Input
                  value={
                    previewStart
                  }
                  onChange={(e) =>
                    setPreviewStart(
                      e.target
                        .value,
                    )
                  }
                  inputMode="text"
                  placeholder="MM:SS — e.g. 01:12"
                />

                {previewEnd ? (
                  <p className="text-xs text-accent">
                    Preview:{" "}
                    {previewStart}–
                    {previewEnd}
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              className="w-full"
              onClick={() =>
                void send()
              }
              disabled={
                busy ||
                checking
              }
            >
              {busy
                ? "Submitting…"
                : "Submit Next in Line"}
            </Button>
          </>
        ) : null}

        {!sourceSubmissionId &&
        error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function errorMessage(
  error:
    | string
    | undefined,
) {
  switch (error) {
    case "already_submitted":
      return "This country has already submitted a Next in Line response.";

    case "duplicate_song":
      return "This song has already been used in Solaris Song Contest and cannot be submitted again.";

    case "duplicate_artist":
      return "This artist has already been submitted for another country in this edition.";

    case "invalid_nf_entry":
      return "That National Final entry is not valid for this country.";

    case "edition_closed":
      return "The Next in Line form is not currently available for this edition.";

    default:
      return "Something went wrong while submitting. Please try again.";
  }
}
