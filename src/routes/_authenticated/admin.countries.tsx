import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  Check,
  Copy,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/button";

import {
  ScopePicker,
} from "@/components/admin/ScopePicker";

import {
  useEditions,
  useScope,
  useSubmissions,
} from "@/lib/adminHooks";

import {
  songSubmitted,
  statusOf,
} from "@/lib/adminModel";

export const Route =
  createFileRoute(
    "/_authenticated/admin/countries",
  )({
    component:
      CountriesPage,
  });

/* ============================================================
 * COUNTRY COPY STATUS
 * ========================================================== */

function countryCopyStatus(
  submission:
    any,
) {
  if (
    !submission
  ) {
    return "No submission";
  }

  if (
    !submission.participating
  ) {
    return "Not participating";
  }

  /* ==========================================================
   * INTERNAL SELECTION
   * ======================================================== */

  if (
    submission.selection_method ===
    "internal"
  ) {
    const entry =
      submission.internal_entries;

    if (
      !entry ||
      !songSubmitted(
        submission,
      )
    ) {
      return "Internal entry not submitted";
    }

    if (
      entry.review_status ===
      "declined"
    ) {
      return "Internal entry declined";
    }

    if (
      entry.review_status ===
      "accepted"
    ) {
      return "Internal entry accepted";
    }

    return "Internal entry submitted";
  }

  /* ==========================================================
   * NATIONAL FINAL
   * ======================================================== */

  if (
    submission.selection_method ===
    "national_final"
  ) {
    const nf =
      submission.national_finals;

    const activeEntries =
      (
        nf
          ?.national_final_entries ??
        []
      ).filter(
        (
          entry:
            any,
        ) =>
          !entry.removed &&
          entry.review_status !==
            "removed",
      );

    /*
     * No active songs at all.
     */
    if (
      activeEntries.length ===
      0
    ) {
      return "NF entries not submitted";
    }

    /*
     * Declined entries take priority because this is the
     * status an organiser most needs to notice.
     *
     * Removed entries were filtered above, so they no longer
     * count here.
     */
    const declinedCount =
      activeEntries.filter(
        (
          entry:
            any,
        ) =>
          entry.review_status ===
          "declined",
      ).length;

    if (
      declinedCount ===
      1
    ) {
      return "NF entry declined";
    }

    if (
      declinedCount >
      1
    ) {
      return `${declinedCount} NF entries declined`;
    }

    /*
     * Entries that have not been reviewed yet.
     */
    const hasPendingEntries =
      activeEntries.some(
        (
          entry:
            any,
        ) =>
          !entry.review_status ||
          entry.review_status ===
            "pending",
      );

    if (
      hasPendingEntries
    ) {
      return "NF entries pending review";
    }

    /*
     * All remaining active entries are accepted.
     */
    const allAccepted =
      activeEntries.every(
        (
          entry:
            any,
        ) =>
          entry.review_status ===
          "accepted",
      );

    if (
      allAccepted
    ) {
      /*
       * An NF is considered complete once an active winner
       * has also been selected.
       */
      const winnerIsActive =
        Boolean(
          nf?.winning_entry_id,
        ) &&
        activeEntries.some(
          (
            entry:
              any,
          ) =>
            entry.id ===
            nf.winning_entry_id,
        );

      if (
        winnerIsActive
      ) {
        return "NF complete";
      }

      return "NF incomplete";
    }

    return "NF incomplete";
  }

  /* ==========================================================
   * FALLBACK
   * ======================================================== */

  return songSubmitted(
    submission,
  )
    ? "Entry submitted"
    : "Entry not submitted";
}

/* ============================================================
 * PAGE
 * ========================================================== */

function CountriesPage() {
  const {
    data:
      editions,
  } =
    useEditions();

  const scope =
    useScope(
      editions,
    );

  const {
    data:
      submissions,
  } =
    useSubmissions(
      scope.editionId
        ? {
            edition_id:
              scope.editionId,
          }
        : {},
    );

  const [
    copied,
    setCopied,
  ] =
    useState<
      | "countries"
      | "status"
      | null
    >(
      null,
    );

  /* ==========================================================
   * GROUP SUBMISSIONS BY COUNTRY
   * ======================================================== */

  const countries =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            any[]
          >();

        for (
          const submission of
            submissions ??
            []
        ) {
          const existing =
            map.get(
              submission.country,
            ) ??
            [];

          existing.push(
            submission,
          );

          map.set(
            submission.country,
            existing,
          );
        }

        /*
         * Keep the newest response first for each country.
         */
        for (
          const rows of
            map.values()
        ) {
          rows.sort(
            (
              a,
              b,
            ) =>
              new Date(
                b.submitted_at,
              ).getTime() -
              new Date(
                a.submitted_at,
              ).getTime(),
          );
        }

        return [
          ...map.entries(),
        ].sort(
          (
            a,
            b,
          ) =>
            a[0].localeCompare(
              b[0],
            ),
        );
      },
      [
        submissions,
      ],
    );

  /* ==========================================================
   * PARTICIPATING COUNTRIES
   * ======================================================== */

  const participatingCountries =
    useMemo(
      () => {
        return countries
          .filter(
            (
              [
                ,
                rows,
              ],
            ) =>
              rows.some(
                (
                  row:
                    any,
                ) =>
                  row.participating ===
                  true,
              ),
          )
          .map(
            (
              [
                country,
              ],
            ) =>
              country,
          );
      },
      [
        countries,
      ],
    );

  /* ==========================================================
   * PARTICIPATING COUNTRY + MOST RECENT PARTICIPATING RESPONSE
   * ======================================================== */

  const participatingCountryStatuses =
    useMemo(
      () => {
        return countries
          .map(
            (
              [
                country,
                rows,
              ],
            ) => {
              const latestParticipating =
                rows.find(
                  (
                    row:
                      any,
                  ) =>
                    row.participating ===
                    true,
                );

              if (
                !latestParticipating
              ) {
                return null;
              }

              return {
                country,

                submission:
                  latestParticipating,

                status:
                  countryCopyStatus(
                    latestParticipating,
                  ),
              };
            },
          )
          .filter(
            Boolean,
          ) as Array<{
            country:
              string;

            submission:
              any;

            status:
              string;
          }>;
      },
      [
        countries,
      ],
    );

  /* ==========================================================
   * CLIPBOARD
   * ======================================================== */

  async function copyText(
    text:
      string,

    type:
      | "countries"
      | "status",
  ) {
    try {
      await navigator.clipboard.writeText(
        text,
      );

      setCopied(
        type,
      );

      window.setTimeout(
        () =>
          setCopied(
            (
              current,
            ) =>
              current ===
              type
                ? null
                : current,
          ),
        1800,
      );
    } catch {
      /*
       * Fallback for browsers where the Clipboard API is
       * unavailable.
       */
      const textarea =
        document.createElement(
          "textarea",
        );

      textarea.value =
        text;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea,
      );

      textarea.select();

      document.execCommand(
        "copy",
      );

      textarea.remove();

      setCopied(
        type,
      );

      window.setTimeout(
        () =>
          setCopied(
            (
              current,
            ) =>
              current ===
              type
                ? null
                : current,
          ),
        1800,
      );
    }
  }

  async function copyParticipatingCountries() {
    const text =
      participatingCountries.join(
        ", ",
      );

    await copyText(
      text,
      "countries",
    );
  }

  async function copyParticipatingStatusList() {
    const text =
      participatingCountryStatuses
        .map(
          (
            row,
          ) =>
            `${row.country} (${row.status})`,
        )
        .join(
          "\n",
        );

    await copyText(
      text,
      "status",
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">
          Countries
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Each delegation and everything they submitted in this edition.
        </p>
      </header>

      <ScopePicker
        scope={
          scope
        }
        editions={
          editions
        }
        showRounds={
          false
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {
              participatingCountries.length
            }
          </span>{" "}
          participating
        </p>

        <div className="flex flex-wrap gap-2">
          {/* PLAIN COUNTRY LIST */}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={
              copyParticipatingCountries
            }
            disabled={
              participatingCountries.length ===
              0
            }
          >
            {copied ===
            "countries" ? (
              <>
                <Check className="size-4" />

                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" />

                Copy countries
              </>
            )}
          </Button>

          {/* COUNTRY + STATUS LIST */}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={
              copyParticipatingStatusList
            }
            disabled={
              participatingCountryStatuses.length ===
              0
            }
          >
            {copied ===
            "status" ? (
              <>
                <Check className="size-4" />

                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" />

                Copy status list
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {countries.map(
          (
            [
              country,
              rows,
            ],
          ) => {
            const latest =
              rows[0];

            const participating =
              rows.some(
                (
                  row:
                    any,
                ) =>
                  row.participating ===
                  true,
              );

            return (
              <div
                key={
                  country
                }
                className="surface overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold leading-tight">
                        {
                          country
                        }
                      </h2>

                      {!participating ? (
                        <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Not participating
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      @
                      {
                        latest.instagram_username
                      }
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {
                      statusOf(
                        latest,
                      )
                    }
                  </span>
                </div>

                <div className="border-t border-border/60">
                  {rows.map(
                    (
                      submission:
                        any,
                    ) => (
                      <Link
                        key={
                          submission.id
                        }
                        to="/admin/responses/$id"
                        params={{
                          id:
                            submission.id,
                        }}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-secondary/30"
                      >
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                          {submission
                            .submission_rounds
                            ?.name ??
                            "Round"}
                        </span>

                        <span className="shrink-0 text-xs text-foreground">
                          {submission.participating
                            ? songSubmitted(
                                submission,
                              )
                              ? "Song submitted"
                              : "Awaiting song"
                            : "Not participating"}
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              </div>
            );
          },
        )}

        {countries.length ===
        0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No responses in this edition yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
