import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useEffect,
  useMemo,
  useState,
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
  checkNextInLineDuplicate,
  getNextInLineCountries,
  submitNextInLine,
  type NextInLineCountry,
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


function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;

  onClick:
    () => void;

  children:
    React.ReactNode;
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


function NextInLinePage() {
  const loadCountries =
    useServerFn(
      getNextInLineCountries,
    );

  const submit =
    useServerFn(
      submitNextInLine,
    );

  const checkDuplicate =
    useServerFn(
      checkNextInLineDuplicate,
    );


  const [
    countries,
    setCountries,
  ] =
    useState<
      NextInLineCountry[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    country,
    setCountry,
  ] =
    useState("");


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


  const [
    selectedNfEntryId,
    setSelectedNfEntryId,
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


  const [
    replacementRequired,
    setReplacementRequired,
  ] =
    useState(false);


  const [
    replacementUrl,
    setReplacementUrl,
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
    error,
    setError,
  ] =
    useState("");


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


  /* ==========================================================
   * LOAD COUNTRIES
   * ======================================================== */

  useEffect(() => {
    void (async () => {
      try {
        const result =
          await loadCountries();

        setCountries(
          result,
        );
      } catch (
        loadError
      ) {
        console.error(
          loadError,
        );

        setError(
          "The Next in Line form could not be loaded.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    })();
  }, [
    loadCountries,
  ]);


  const selectedCountry =
    useMemo(
      () =>
        countries.find(
          (
            item,
          ) =>
            item.country ===
            country,
        ) ??
        null,

      [
        countries,
        country,
      ],
    );


  const isNationalFinal =
    selectedCountry
      ?.selection_method ===
      "national_final" &&
    selectedCountry
      .nf_entries.length >
      0;


  const selectedNfEntry =
    useMemo(
      () =>
        selectedCountry
          ?.nf_entries.find(
            (
              entry,
            ) =>
              entry.id ===
              selectedNfEntryId,
          ) ??
        null,

      [
        selectedCountry,
        selectedNfEntryId,
      ],
    );


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
   * RESET WHEN COUNTRY CHANGES
   * ======================================================== */

  function changeCountry(
    value: string,
  ) {
    setCountry(
      value,
    );

    setParticipating(
      null,
    );

    setEntryUnknown(
      false,
    );

    setSelectedNfEntryId(
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

    setReplacementRequired(
      false,
    );

    setReplacementUrl(
      "",
    );

    setDuplicate(
      null,
    );

    setError(
      "",
    );
  }


  /* ==========================================================
   * INSTANT DUPLICATE CHECK
   *
   * Only needed for typed internal entries.
   *
   * Existing NF entries already belong to this country's
   * normal submission and should not block themselves.
   * ======================================================== */

  useEffect(() => {
    if (
      !selectedCountry ||
      isNationalFinal ||
      entryUnknown ||
      participating !==
        true
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
                      selectedCountry.edition_id,

                    source_submission_id:
                      selectedCountry.source_submission_id,

                    country:
                      selectedCountry.country,

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
    artist,
    songTitle,
    songUrl,
    selectedCountry,
    isNationalFinal,
    entryUnknown,
    participating,
    checkDuplicate,
  ]);


  function duplicateMessage() {
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
      return "This artist has already been submitted by another country in this edition.";
    }


    return "";
  }


  /* ==========================================================
   * SUBMIT
   * ======================================================== */

  async function handleSubmit() {
    setError(
      "",
    );


    if (
      !selectedCountry
    ) {
      setError(
        "Select your country.",
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
                selectedCountry.edition_id,

              source_submission_id:
                selectedCountry.source_submission_id,

              country:
                selectedCountry.country,

              participating:
                false,

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

              replacement_video_required:
                false,

              replacement_video_url:
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
          "The response could not be submitted.",
        );
      } finally {
        setSubmitting(
          false,
        );
      }


      return;
    }


    /* ========================================================
     * YES, BUT ENTRY UNKNOWN
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
                selectedCountry.edition_id,

              source_submission_id:
                selectedCountry.source_submission_id,

              country:
                selectedCountry.country,

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

              replacement_video_required:
                false,

              replacement_video_url:
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
          "The response could not be submitted.",
        );
      } finally {
        setSubmitting(
          false,
        );
      }


      return;
    }


    /* ========================================================
     * KNOWN NF ENTRY
     * ====================================================== */

    if (
      isNationalFinal &&
      !selectedNfEntry
    ) {
      setError(
        "Select one of your National Final entries.",
      );

      return;
    }


    /* ========================================================
     * KNOWN INTERNAL ENTRY
     * ====================================================== */

    if (
      !isNationalFinal
    ) {
      if (
        !artist.trim()
      ) {
        setError(
          "Enter the artist.",
        );

        return;
      }


      if (
        !songTitle.trim()
      ) {
        setError(
          "Enter the song title.",
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
          "Enter a valid song link.",
        );

        return;
      }


      if (
        duplicate
      ) {
        setError(
          duplicateMessage(),
        );

        return;
      }
    }


    /* ========================================================
     * PREVIEW
     * ====================================================== */

    if (
      parseTimestamp(
        previewStart,
      ) ===
      null
    ) {
      setError(
        "Enter the 25-second preview start as MM:SS, for example 01:12.",
      );

      return;
    }


    if (
      !previewEnd
    ) {
      setError(
        "The preview timestamp is not valid.",
      );

      return;
    }


    /* ========================================================
     * REPLACEMENT VIDEO
     * ====================================================== */

    if (
      replacementRequired &&
      (
        !replacementUrl.trim() ||
        !isValidUrl(
          replacementUrl,
        )
      )
    ) {
      setError(
        "Enter a valid replacement video link.",
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
              selectedCountry.edition_id,

            source_submission_id:
              selectedCountry.source_submission_id,

            country:
              selectedCountry.country,

            participating:
              true,

            entry_unknown:
              false,

            selection_type:
              isNationalFinal
                ? "national_final"
                : "internal",

            national_final_entry_id:
              isNationalFinal
                ? selectedNfEntryId
                : null,

            artist:
              isNationalFinal
                ? selectedNfEntry?.artist ??
                  ""
                : artist,

            song_title:
              isNationalFinal
                ? selectedNfEntry?.song_title ??
                  ""
                : songTitle,

            song_url:
              isNationalFinal
                ? selectedNfEntry?.song_url ??
                  ""
                : songUrl,

            preview_start:
              previewStart,

            preview_end:
              previewEnd,

            replacement_video_required:
              replacementRequired,

            replacement_video_url:
              replacementRequired
                ? replacementUrl
                : "",
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


      if (
        result.error ===
        "duplicate_song"
      ) {
        setError(
          "This song has already been used in Solaris Song Contest and cannot be submitted again.",
        );

        return;
      }


      if (
        result.error ===
        "duplicate_artist"
      ) {
        setError(
          "This artist has already been submitted by another country in this edition.",
        );

        return;
      }


      if (
        result.error ===
        "invalid_nf_entry"
      ) {
        setError(
          "That National Final entry does not belong to this country.",
        );

        return;
      }


      setError(
        "The response could not be submitted.",
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
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10 sm:py-16">
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
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10 sm:py-16">
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
            Line response
            has been saved.
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
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10 sm:py-16">
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


        <h1 className="text-solar mt-2 text-4xl font-normal sm:text-6xl">
          Next in Line
        </h1>


        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Tell us whether
          your delegation
          would participate
          if another place
          becomes
          available.
        </p>
      </header>


      <div className="surface space-y-7 p-5 sm:p-7">
        {/* ====================================================
         * COUNTRY
         * ================================================== */}

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
              changeCountry(
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
                    item.country
                  }
                  value={
                    item.country
                  }
                >
                  {
                    item.country
                  }
                </option>
              ),
            )}
          </select>
        </div>


        {selectedCountry ? (
          <>
            {/* ================================================
             * PARTICIPATION
             * ============================================== */}

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
                      "",
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
                      "",
                    );
                  }}
                >
                  No
                </Choice>
              </div>
            </div>


            {/* ================================================
             * YES
             * ============================================== */}

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
                          "",
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

                        setError(
                          "",
                        );

                        setDuplicate(
                          null,
                        );
                      }}
                    >
                      I don't
                      know yet
                    </Choice>
                  </div>
                </div>


                {/* ============================================
                 * NATIONAL FINAL
                 * ========================================== */}

                {!entryUnknown &&
                isNationalFinal ? (
                  <div className="space-y-3">
                    <div>
                      <Label>
                        Choose your
                        National
                        Final entry
                      </Label>


                      <p className="mt-1 text-xs text-muted-foreground">
                        These are
                        the entries
                        your country
                        already
                        submitted
                        for this
                        edition.
                      </p>
                    </div>


                    <div className="grid gap-2">
                      {selectedCountry.nf_entries.map(
                        (
                          entry,
                        ) => (
                          <Choice
                            key={
                              entry.id
                            }
                            selected={
                              selectedNfEntryId ===
                              entry.id
                            }
                            onClick={() => {
                              setSelectedNfEntryId(
                                entry.id,
                              );

                              setError(
                                "",
                              );
                            }}
                          >
                            <span className="block font-medium text-foreground">
                              {
                                entry.artist
                              }
                            </span>


                            <span className="mt-0.5 block text-xs">
                              {
                                entry.song_title
                              }
                            </span>
                          </Choice>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}


                {/* ============================================
                 * INTERNAL
                 * ========================================== */}

                {!entryUnknown &&
                !isNationalFinal ? (
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
                            "",
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
                            "",
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
                            "",
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
                      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                        {
                          duplicateMessage()
                        }
                      </p>
                    ) : null}
                  </div>
                ) : null}


                {/* ============================================
                 * KNOWN ENTRY DETAILS
                 * ========================================== */}

                {!entryUnknown ? (
                  <>
                    <div className="space-y-2">
                      <Label>
                        25-second
                        preview
                      </Label>


                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Enter the
                        point where
                        your
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
                            "",
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


                    <div className="space-y-3">
                      <Label>
                        Do you
                        need a
                        replacement
                        video?
                      </Label>


                      <div className="grid grid-cols-2 gap-2">
                        <Choice
                          selected={
                            replacementRequired
                          }
                          onClick={() => {
                            setReplacementRequired(
                              true,
                            );

                            setError(
                              "",
                            );
                          }}
                        >
                          Yes
                        </Choice>


                        <Choice
                          selected={
                            !replacementRequired
                          }
                          onClick={() => {
                            setReplacementRequired(
                              false,
                            );

                            setReplacementUrl(
                              "",
                            );

                            setError(
                              "",
                            );
                          }}
                        >
                          No
                        </Choice>
                      </div>
                    </div>


                    {replacementRequired ? (
                      <div className="space-y-2">
                        <Label>
                          Replacement
                          video link
                        </Label>


                        <Input
                          value={
                            replacementUrl
                          }
                          onChange={(
                            event,
                          ) => {
                            setReplacementUrl(
                              event.target
                                .value,
                            );

                            setError(
                              "",
                            );
                          }}
                          placeholder="https://..."
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}


            {/* ================================================
             * ERROR
             * ============================================== */}

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}


            {/* ================================================
             * SUBMIT
             * ============================================== */}

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
                  void handleSubmit()
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


        {!selectedCountry &&
        error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
