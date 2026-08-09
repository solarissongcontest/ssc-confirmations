import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  ArrowLeft,
  Check,
} from "lucide-react";

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
  getNextInLineCountries,
  getNextInLineCountry,
  submitNextInLine,
  type NextInLineEdition,
  type NextInLineNfEntry,
} from "@/lib/nextInLine.functions";

import {
  checkEntryDuplicate,
} from "@/lib/public.functions";

import {
  isValidUrl,
  offsetTimestamp,
  parseTimestamp,
} from "@/lib/ssc";

import {
  cn,
} from "@/lib/utils";

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

/* ============================================================
 * CHOICE BUTTON
 * ========================================================== */

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;

  onClick:
    () => void;

  children:
    ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={cn(
        "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",

        selected
          ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================
 * PAGE
 * ========================================================== */

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

  /* ==========================================================
   * GENERAL STATE
   * ======================================================== */

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadingCountry,
    setLoadingCountry,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    done,
    setDone,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  /* ==========================================================
   * EDITION / COUNTRY
   * ======================================================== */

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
    useState<string[]>(
      [],
    );

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

  /* ==========================================================
   * PARTICIPATION
   * ======================================================== */

  const [
    participating,
    setParticipating,
  ] =
    useState<
      boolean | null
    >(null);

  const [
    entryUnknown,
    setEntryUnknown,
  ] =
    useState(false);

  /* ==========================================================
   * ENTRY
   * ======================================================== */

  const [
    selectedNfEntry,
    setSelectedNfEntry,
  ] =
    useState("");

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

  const previewEnd =
    useMemo(
      () =>
        offsetTimestamp(
          previewStart,
          25,
        ),
      [
        previewStart,
      ],
    );

  /* ==========================================================
   * DUPLICATES
   * ======================================================== */

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

  /* ==========================================================
   * LOAD ACTIVE EDITION + COUNTRIES
   * ======================================================== */

  useEffect(() => {
    let cancelled =
      false;

    void (async () => {
      try {
        const result =
          await loadCountries();

        if (
          cancelled
        ) {
          return;
        }

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
          (
            result.countries ??
            []
          ).map(
            (
              item,
            ) =>
              item.country,
          ),
        );
      } catch (
        loadError
      ) {
        console.error(
          "Could not load Next in Line:",
          loadError,
        );

        if (
          !cancelled
        ) {
          setError(
            "The Next in Line form could not be loaded.",
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          );
        }
      }
    })();

    return () => {
      cancelled =
        true;
    };
  }, [
    loadCountries,
  ]);

  /* ==========================================================
   * CHANGE COUNTRY
   * ======================================================== */

  async function chooseCountry(
    value: string,
  ) {
    setCountry(
      value,
    );

    setSourceSubmissionId(
      "",
    );

    setOriginalMethod(
      null,
    );

    setNfEntries(
      [],
    );

    setParticipating(
      null,
    );

    setEntryUnknown(
      false,
    );

    setSelectedNfEntry(
      "",
    );

    setArtist(
      "",
    );

    setSongTitle(
      "",
    );

    setSongUrl(
      "",
    );

    setPreviewStart(
      "",
    );

    setDuplicate(
      null,
    );

    setError(
      null,
    );

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
    } catch (
      loadError
    ) {
      console.error(
        "Country load failed:",
        loadError,
      );

      setError(
        "That country's entry information could not be loaded.",
      );
    } finally {
      setLoadingCountry(
        false,
      );
    }
  }

  /* ==========================================================
   * LIVE DUPLICATE CHECK
   *
   * Only applies when typing a NEW internal Next in Line entry.
   * Existing NF entries must not flag themselves.
   * ======================================================== */

  useEffect(() => {
    if (
      participating !==
        true ||
      entryUnknown ||
      originalMethod ===
        "national_final" ||
      !edition
    ) {
      setDuplicate(
        null,
      );

      return;
    }

    const cleanArtist =
      artist.trim();

    const cleanSong =
      songTitle.trim();

    const cleanUrl =
      songUrl.trim();

    if (
      cleanArtist.length <
        2 &&
      cleanSong.length <
        2 &&
      cleanUrl.length <
        4
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
        () => {
          void (async () => {
            setChecking(
              true,
            );

            try {
              const result =
                await checkDuplicate({
                  data: {
                    edition_id:
                      edition.id,

                    submission_id:
                      null,

                    artist:
                      cleanArtist,

                    song_title:
                      cleanSong,

                    song_url:
                      cleanUrl,
                  },
                });

              if (
                cancelled
              ) {
                return;
              }

              if (
                result.ok &&
                result.duplicate
              ) {
                setDuplicate(
                  result.type,
                );
              } else {
                setDuplicate(
                  null,
                );
              }
            } catch (
              duplicateError
            ) {
              console.error(
                "Duplicate check failed:",
                duplicateError,
              );
            } finally {
              if (
                !cancelled
              ) {
                setChecking(
                  false,
                );
              }
            }
          })();
        },
        500,
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timer,
      );
    };
  }, [
    participating,
    entryUnknown,
    originalMethod,
    edition,
    artist,
    songTitle,
    songUrl,
    checkDuplicate,
  ]);

  /* ==========================================================
   * DUPLICATE MESSAGE
   * ======================================================== */

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

    return "";
  }

  /* ==========================================================
   * SUBMIT
   * ======================================================== */

  async function send() {
    setError(
      null,
    );

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
      participating ===
      null
    ) {
      setError(
        "Choose whether you would participate as Next in Line.",
      );

      return;
    }

    /* ========================================================
     * NO
     * ====================================================== */

    if (
      participating ===
      false
    ) {
      setSubmitting(
        true,
      );

      try {
        const result =
          await submit({
            data: {
              edition_id:
                edition.id,

              source_submission_id:
                sourceSubmissionId,

              country,

              participating:
                false,

              entry_unknown:
                true,

              selection_type:
                "none",

              national_final_entry_id:
                null,

              artist:
                "",

              song_title:
                "",

              song_url:
                "",

              preview_start:
                "",

              preview_end:
                "",
            },
          });

        if (
          result.ok
        ) {
          setDone(
            true,
          );

          return;
        }

        setError(
          errorMessage(
            result.error,
          ),
        );
      } finally {
        setSubmitting(
          false,
        );
      }

      return;
    }

    /* ========================================================
     * YES, ENTRY UNKNOWN
     * ====================================================== */

    if (
      entryUnknown
    ) {
      setSubmitting(
        true,
      );

      try {
        const result =
          await submit({
            data: {
              edition_id:
                edition.id,

              source_submission_id:
                sourceSubmissionId,

              country,

              participating:
                true,

              entry_unknown:
                true,

              selection_type:
                "unknown",

              national_final_entry_id:
                null,

              artist:
                "",

              song_title:
                "",

              song_url:
                "",

              preview_start:
                "",

              preview_end:
                "",
            },
          });

        if (
          result.ok
        ) {
          setDone(
            true,
          );

          return;
        }

        setError(
          errorMessage(
            result.error,
          ),
        );
      } finally {
        setSubmitting(
          false,
        );
      }

      return;
    }

    /* ========================================================
     * KNOWN ENTRY
     * ====================================================== */

    let selectionType:
      | "internal"
      | "national_final";

    let finalArtist =
      artist.trim();

    let finalSong =
      songTitle.trim();

    let finalUrl =
      songUrl.trim();

    let nfEntryId:
      | string
      | null =
      null;

    if (
      originalMethod ===
      "national_final"
    ) {
      selectionType =
        "national_final";

      const selected =
        nfEntries.find(
          (
            entry,
          ) =>
            entry.id ===
            selectedNfEntry,
        );

      if (!selected) {
        setError(
          "Choose one of your National Final entries.",
        );

        return;
      }

      nfEntryId =
        selected.id;

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
        !finalArtist
      ) {
        setError(
          "Enter the artist.",
        );

        return;
      }

      if (
        !finalSong
      ) {
        setError(
          "Enter the song title.",
        );

        return;
      }

      if (
        !finalUrl ||
        !isValidUrl(
          finalUrl,
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

    /* ========================================================
     * 25 SECOND PREVIEW
     * ====================================================== */

    if (
      parseTimestamp(
        previewStart,
      ) ===
      null
    ) {
      setError(
        "Enter the preview start as MM:SS, for example 01:12.",
      );

      return;
    }

    if (
      !previewEnd
    ) {
      setError(
        "The preview timestamp is invalid.",
      );

      return;
    }

    setSubmitting(
      true,
    );

    try {
      const result =
        await submit({
          data: {
            edition_id:
              edition.id,

            source_submission_id:
              sourceSubmissionId,

            country,

            participating:
              true,

            entry_unknown:
              false,

            selection_type:
              selectionType,

            national_final_entry_id:
              nfEntryId,

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
        setDone(
          true,
        );

        return;
      }

      setError(
        errorMessage(
          result.error,
        ),
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* ==========================================================
   * LOADING
   * ======================================================== */

  if (
    loading
  ) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-10 sm:py-16">
        <div className="surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Loading Next
            in Line…
          </p>
        </div>
      </main>
    );
  }

  /* ==========================================================
   * SUCCESS
   * ======================================================== */

  if (
    done
  ) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-10 sm:py-16">
        <div className="surface p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-6" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Response
            submitted
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your Next in
            Line response for{" "}
            {country} has
            been received.
          </p>

          <Button
            className="mt-6"
            asChild
          >
            <Link to="/">
              Return to
              confirmations
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  /* ==========================================================
   * FORM
   * ======================================================== */

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-10 sm:py-16">
      <Link
        to="/"
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        Confirmations
      </Link>

      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Solaris Song
          Contest
        </p>

        <h1 className="text-solar mt-2 text-4xl font-normal sm:text-5xl">
          Next in Line
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Tell us whether
          your delegation
          would participate
          if another place
          becomes
          available.
        </p>

        {edition ? (
          <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
            {edition.name}
          </p>
        ) : null}
      </header>

      <div className="surface space-y-7 p-5 sm:p-7">
        {/* COUNTRY */}

        <div className="space-y-2">
          <Label>
            Country
          </Label>

          <select
            value={
              country
            }
            onChange={(
              event,
            ) =>
              void chooseCountry(
                event.target
                  .value,
              )
            }
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">
              Select your
              country
            </option>

            {countries.map(
              (
                item,
              ) => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </div>

        {loadingCountry ? (
          <p className="text-sm text-muted-foreground">
            Loading
            country…
          </p>
        ) : null}

        {sourceSubmissionId ? (
          <>
            {/* PARTICIPATION */}

            <div className="space-y-3">
              <Label>
                Would you
                participate
                as Next in
                Line if a
                place becomes
                available?
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <Choice
                  selected={
                    participating ===
                    true
                  }
                  onClick={() => {
                    setParticipating(
                      true,
                    );

                    setError(
                      null,
                    );
                  }}
                >
                  Yes
                </Choice>

                <Choice
                  selected={
                    participating ===
                    false
                  }
                  onClick={() => {
                    setParticipating(
                      false,
                    );

                    setError(
                      null,
                    );
                  }}
                >
                  No
                </Choice>
              </div>
            </div>

            {/* YES */}

            {participating ===
            true ? (
              <>
                <div className="space-y-3">
                  <Label>
                    Do you
                    know your
                    Next in
                    Line entry?
                  </Label>

                  <div className="grid grid-cols-2 gap-2">
                    <Choice
                      selected={
                        !entryUnknown
                      }
                      onClick={() => {
                        setEntryUnknown(
                          false,
                        );

                        setError(
                          null,
                        );
                      }}
                    >
                      Yes
                    </Choice>

                    <Choice
                      selected={
                        entryUnknown
                      }
                      onClick={() => {
                        setEntryUnknown(
                          true,
                        );

                        setDuplicate(
                          null,
                        );

                        setError(
                          null,
                        );
                      }}
                    >
                      I don't
                      know yet
                    </Choice>
                  </div>
                </div>

                {/* NF ENTRY */}

                {!entryUnknown &&
                originalMethod ===
                  "national_final" ? (
                  <div className="space-y-3">
                    <div>
                      <Label>
                        Choose your
                        National
                        Final entry
                      </Label>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Choose from
                        the entries
                        already
                        submitted
                        for your
                        National
                        Final.
                      </p>
                    </div>

                    {nfEntries.length >
                    0 ? (
                      <div className="grid gap-2">
                        {nfEntries.map(
                          (
                            entry,
                          ) => (
                            <Choice
                              key={
                                entry.id
                              }
                              selected={
                                selectedNfEntry ===
                                entry.id
                              }
                              onClick={() => {
                                setSelectedNfEntry(
                                  entry.id,
                                );

                                setError(
                                  null,
                                );
                              }}
                            >
                              <span className="block font-medium text-foreground">
                                {entry.artist ??
                                  "Unknown artist"}
                              </span>

                              <span className="mt-0.5 block text-xs">
                                {entry.song_title ??
                                  "Unknown song"}
                              </span>
                            </Choice>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
                        No National
                        Final
                        entries are
                        available.
                        Choose
                        “I don't
                        know yet”
                        above if
                        your entry
                        has not
                        been
                        decided.
                      </p>
                    )}
                  </div>
                ) : null}

                {/* INTERNAL / UNKNOWN SELECTION */}

                {!entryUnknown &&
                originalMethod !==
                  "national_final" ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>
                        Artist
                      </Label>

                      <Input
                        value={
                          artist
                        }
                        onChange={(
                          event,
                        ) => {
                          setArtist(
                            event.target
                              .value,
                          );

                          setError(
                            null,
                          );
                        }}
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
                        onChange={(
                          event,
                        ) => {
                          setSongTitle(
                            event.target
                              .value,
                          );

                          setError(
                            null,
                          );
                        }}
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
                        onChange={(
                          event,
                        ) => {
                          setSongUrl(
                            event.target
                              .value,
                          );

                          setError(
                            null,
                          );
                        }}
                        placeholder="https://..."
                      />
                    </div>

                    {checking ? (
                      <p className="text-xs text-muted-foreground">
                        Checking
                        entry…
                      </p>
                    ) : null}

                    {duplicate ? (
                      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                        {
                          duplicateText()
                        }
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* PREVIEW */}

                {!entryUnknown ? (
                  <div className="space-y-2">
                    <Label>
                      25-second
                      preview
                      start
                    </Label>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Enter where
                      the
                      25-second
                      preview
                      should
                      begin.
                    </p>

                    <Input
                      value={
                        previewStart
                      }
                      onChange={(
                        event,
                      ) => {
                        setPreviewStart(
                          event.target
                            .value,
                        );

                        setError(
                          null,
                        );
                      }}
                      inputMode="text"
                      placeholder="MM:SS — e.g. 01:12"
                    />

                    {previewEnd ? (
                      <p className="text-xs font-medium text-accent">
                        Preview:{" "}
                        {
                          previewStart
                        }
                        {" – "}
                        {
                          previewEnd
                        }
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {/* ERROR */}

            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {/* SUBMIT */}

            {participating !==
            null ? (
              <Button
                type="button"
                className="w-full"
                disabled={
                  submitting ||
                  checking
                }
                onClick={() =>
                  void send()
                }
              >
                {submitting
                  ? "Submitting…"
                  : participating
                    ? "Submit Next in Line"
                    : "Submit response"}
              </Button>
            ) : null}
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

/* ============================================================
 * SERVER ERROR COPY
 * ========================================================== */

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

    case "invalid_country":
      return "That country is not available for this edition.";

    case "entry_required":
      return "Artist, song title and song link are required.";

    case "preview_required":
      return "A 25-second preview timestamp is required.";

    default:
      return "Something went wrong while submitting. Please try again.";
  }
}
