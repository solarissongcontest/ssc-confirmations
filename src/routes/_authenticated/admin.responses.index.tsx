import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Search,
  XCircle,
} from "lucide-react";

import {
  useEditions,
  useNextInLineSubmissions,
  useScope,
  useSubmissions,
} from "@/lib/adminHooks";

import {
  songSubmitted,
  statusOf,
  type AdminSubmission,
} from "@/lib/adminModel";

import {
  ScopePicker,
} from "@/components/admin/ScopePicker";

import {
  Input,
} from "@/components/ui/input";

import {
  cn,
} from "@/lib/utils";

export const Route =
  createFileRoute(
    "/_authenticated/admin/responses/",
  )({
    component:
      ResponsesPage,
  });

const FILTERS = [
  "All",
  "Participating",
  "Not participating",
  "Internal",
  "National Final",
  "Song submitted",
  "Song missing",
  "Unreviewed",

  "Songs accepted overall",
  "NF songs accepted",
  "Internal songs accepted",

  "Songs declined overall",
  "NF songs declined",
  "Internal songs declined",
] as const;

type CardState =
  | "unreviewed"
  | "declined"
  | "normal"
  | "nf_issue"
  | "accepted";

/* ============================================================
 * ACTIVE NATIONAL FINAL ENTRIES
 *
 * Removed songs no longer count as part of the NF for:
 * - card colour
 * - accepted filters
 * - declined filters
 *
 * This means removing a declined song also removes the
 * declined/yellow state caused by that song.
 * ========================================================== */

function activeNfEntries(
  submission:
    AdminSubmission,
) {
  return (
    submission
      .national_finals
      ?.national_final_entries ??
    []
  ).filter(
    (
      entry,
    ) =>
      !entry.removed &&
      entry.review_status !==
        "removed",
  );
}

/* ============================================================
 * ENTRY STATUS HELPERS
 * ========================================================== */

function hasAcceptedNfSong(
  submission:
    AdminSubmission,
) {
  if (
    submission.selection_method !==
    "national_final"
  ) {
    return false;
  }

  return activeNfEntries(
    submission,
  ).some(
    (
      entry,
    ) =>
      entry.review_status ===
      "accepted",
  );
}

function hasDeclinedNfSong(
  submission:
    AdminSubmission,
) {
  if (
    submission.selection_method !==
    "national_final"
  ) {
    return false;
  }

  return activeNfEntries(
    submission,
  ).some(
    (
      entry,
    ) =>
      entry.review_status ===
      "declined",
  );
}

function hasAcceptedInternalSong(
  submission:
    AdminSubmission,
) {
  return (
    submission.selection_method ===
      "internal" &&
    submission.internal_entries
      ?.review_status ===
      "accepted"
  );
}

function hasDeclinedInternalSong(
  submission:
    AdminSubmission,
) {
  return (
    submission.selection_method ===
      "internal" &&
    submission.internal_entries
      ?.review_status ===
      "declined"
  );
}

function hasAnyAcceptedSong(
  submission:
    AdminSubmission,
) {
  return (
    hasAcceptedInternalSong(
      submission,
    ) ||
    hasAcceptedNfSong(
      submission,
    )
  );
}

function hasAnyDeclinedSong(
  submission:
    AdminSubmission,
) {
  return (
    hasDeclinedInternalSong(
      submission,
    ) ||
    hasDeclinedNfSong(
      submission,
    )
  );
}

/* ============================================================
 * RESPONSE CARD STATE
 * ========================================================== */

function responseCardState(
  submission:
    AdminSubmission,
): CardState {
  if (
    !songSubmitted(
      submission,
    )
  ) {
    return "normal";
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

    if (!entry) {
      return "normal";
    }

    if (
      entry.review_status ===
      "accepted"
    ) {
      return "accepted";
    }

    if (
      entry.review_status ===
      "declined"
    ) {
      return "declined";
    }

    return "unreviewed";
  }

  /* ==========================================================
   * NATIONAL FINAL
   *
   * IMPORTANT:
   * Removed entries are ignored completely here.
   * ======================================================== */

  if (
    submission.selection_method ===
    "national_final"
  ) {
    const entries =
      activeNfEntries(
        submission,
      );

    if (
      entries.length ===
      0
    ) {
      return "normal";
    }

    /*
     * Only ACTIVE declined songs make the NF yellow.
     *
     * A removed declined entry is no longer part of the NF
     * and therefore cannot keep the response yellow.
     */
    const hasNfProblem =
      entries.some(
        (
          entry,
        ) =>
          entry.review_status ===
          "declined",
      );

    if (
      hasNfProblem
    ) {
      return "nf_issue";
    }

    /*
     * If every remaining active NF entry has been accepted,
     * the response is green.
     */
    const allAccepted =
      entries.every(
        (
          entry,
        ) =>
          entry.review_status ===
          "accepted",
      );

    if (
      allAccepted
    ) {
      return "accepted";
    }

    /*
     * Active entries exist, nothing is declined, but at least
     * one entry still needs review.
     */
    return "unreviewed";
  }

  return "normal";
}

/* ============================================================
 * SORT PRIORITY
 *
 * 0 = RED
 * 1 = NORMAL
 * 2 = YELLOW
 * 3 = GREEN
 * ========================================================== */

function statePriority(
  state:
    CardState,
) {
  if (
    state ===
      "unreviewed" ||
    state ===
      "declined"
  ) {
    return 0;
  }

  if (
    state ===
    "normal"
  ) {
    return 1;
  }

  if (
    state ===
    "nf_issue"
  ) {
    return 2;
  }

  return 3;
}

/* ============================================================
 * CARD GLOW
 * ========================================================== */

function mobileCardClasses(
  state:
    CardState,
) {
  if (
    state ===
      "unreviewed" ||
    state ===
      "declined"
  ) {
    return [
      "border border-destructive/80",
      "bg-destructive/10",
      "shadow-[0_0_14px_rgba(239,68,68,0.35),0_0_34px_rgba(239,68,68,0.18),inset_0_0_18px_rgba(239,68,68,0.06)]",
    ].join(
      " ",
    );
  }

  if (
    state ===
    "nf_issue"
  ) {
    return [
      "border border-warning/80",
      "bg-warning/10",
      "shadow-[0_0_14px_rgba(234,179,8,0.32),0_0_34px_rgba(234,179,8,0.16),inset_0_0_18px_rgba(234,179,8,0.05)]",
    ].join(
      " ",
    );
  }

  if (
    state ===
    "accepted"
  ) {
    return [
      "border border-success/70",
      "bg-success/10",
      "shadow-[0_0_14px_rgba(34,197,94,0.30),0_0_34px_rgba(34,197,94,0.15),inset_0_0_18px_rgba(34,197,94,0.05)]",
    ].join(
      " ",
    );
  }

  return "";
}

/* ============================================================
 * BADGE
 * ========================================================== */

function stateBadge(
  state:
    CardState,
) {
  if (
    state ===
    "unreviewed"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/45 bg-destructive/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-destructive">
        <CircleAlert className="size-3" />

        Needs review
      </span>
    );
  }

  if (
    state ===
    "declined"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/45 bg-destructive/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-destructive">
        <XCircle className="size-3" />

        Entry declined
      </span>
    );
  }

  if (
    state ===
    "nf_issue"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/45 bg-warning/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-warning">
        <CircleAlert className="size-3" />

        NF entry declined
      </span>
    );
  }

  if (
    state ===
    "accepted"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/35 bg-success/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-success">
        <CheckCircle2 className="size-3" />

        Accepted
      </span>
    );
  }

  return (
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
      Not submitted
    </span>
  );
}

/* ============================================================
 * PAGE
 * ========================================================== */

function ResponsesPage() {
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

    isLoading,
  } =
    useSubmissions({
      ...(scope.editionId
        ? {
            edition_id:
              scope.editionId,
          }
        : {}),

      ...(
        scope.roundId &&
        !scope.isNextInLine
          ? {
              round_id:
                scope.roundId,
            }
          : {}
      ),
    });

  const {
    data:
      nextInLine,

    isLoading:
      nextLoading,
  } =
    useNextInLineSubmissions(
      scope.editionId ||
        undefined,
    );

  const [
    filter,
    setFilter,
  ] =
    useState<
      (typeof FILTERS)[number]
    >(
      "All",
    );

  const [
    q,
    setQ,
  ] =
    useState("");

  /* ==========================================================
   * NORMAL CONFIRMATIONS
   * ======================================================== */

  const rows =
    useMemo(
      () => {
        let list = [
          ...(
            submissions ??
            []
          ),
        ];

        if (
          filter ===
          "Participating"
        ) {
          list =
            list.filter(
              (
                submission,
              ) =>
                submission.participating,
            );
        }

        if (
          filter ===
          "Not participating"
        ) {
          list =
            list.filter(
              (
                submission,
              ) =>
                !submission.participating,
            );
        }

        if (
          filter ===
          "Internal"
        ) {
          list =
            list.filter(
              (
                submission,
              ) =>
                submission.selection_method ===
                "internal",
            );
        }

        if (
          filter ===
          "National Final"
        ) {
          list =
            list.filter(
              (
                submission,
              ) =>
                submission.selection_method ===
                "national_final",
            );
        }

        if (
          filter ===
          "Song submitted"
        ) {
          list =
            list.filter(
              songSubmitted,
            );
        }

        if (
          filter ===
          "Song missing"
        ) {
          list =
            list.filter(
              (
                submission,
              ) =>
                submission.participating &&
                !songSubmitted(
                  submission,
                ),
            );
        }

        if (
          filter ===
          "Unreviewed"
        ) {
          list =
            list.filter(
              (
                submission,
              ) =>
                responseCardState(
                  submission,
                ) ===
                "unreviewed",
            );
        }

        /* ====================================================
         * ACCEPTED FILTERS
         * ================================================== */

        if (
          filter ===
          "Songs accepted overall"
        ) {
          list =
            list.filter(
              hasAnyAcceptedSong,
            );
        }

        if (
          filter ===
          "NF songs accepted"
        ) {
          list =
            list.filter(
              hasAcceptedNfSong,
            );
        }

        if (
          filter ===
          "Internal songs accepted"
        ) {
          list =
            list.filter(
              hasAcceptedInternalSong,
            );
        }

        /* ====================================================
         * DECLINED FILTERS
         *
         * Removed NF songs are intentionally excluded.
         * ================================================== */

        if (
          filter ===
          "Songs declined overall"
        ) {
          list =
            list.filter(
              hasAnyDeclinedSong,
            );
        }

        if (
          filter ===
          "NF songs declined"
        ) {
          list =
            list.filter(
              hasDeclinedNfSong,
            );
        }

        if (
          filter ===
          "Internal songs declined"
        ) {
          list =
            list.filter(
              hasDeclinedInternalSong,
            );
        }

        /* ====================================================
         * SEARCH
         * ================================================== */

        const term =
          q
            .trim()
            .toLowerCase();

        if (term) {
          list =
            list.filter(
              (
                submission,
              ) => {
                const nfEntryMatch =
                  (
                    submission
                      .national_finals
                      ?.national_final_entries ??
                    []
                  ).some(
                    (
                      entry,
                    ) =>
                      (
                        entry.artist ??
                        ""
                      )
                        .toLowerCase()
                        .includes(
                          term,
                        ) ||
                      (
                        entry.song_title ??
                        ""
                      )
                        .toLowerCase()
                        .includes(
                          term,
                        ),
                  );

                return (
                  submission.country
                    .toLowerCase()
                    .includes(
                      term,
                    ) ||

                  submission.instagram_username
                    .toLowerCase()
                    .includes(
                      term,
                    ) ||

                  (
                    submission
                      .internal_entries
                      ?.song_title ??
                    ""
                  )
                    .toLowerCase()
                    .includes(
                      term,
                    ) ||

                  (
                    submission
                      .internal_entries
                      ?.artist ??
                    ""
                  )
                    .toLowerCase()
                    .includes(
                      term,
                    ) ||

                  (
                    submission
                      .national_finals
                      ?.nf_name ??
                    ""
                  )
                    .toLowerCase()
                    .includes(
                      term,
                    ) ||

                  nfEntryMatch
                );
              },
            );
        }

        /*
         * GROUP BY CARD COLOUR:
         *
         * 1. RED
         * 2. NORMAL
         * 3. YELLOW
         * 4. GREEN
         */

        list.sort(
          (
            a,
            b,
          ) => {
            const aState =
              responseCardState(
                a,
              );

            const bState =
              responseCardState(
                b,
              );

            const priorityDifference =
              statePriority(
                aState,
              ) -
              statePriority(
                bState,
              );

            if (
              priorityDifference !==
              0
            ) {
              return priorityDifference;
            }

            /*
             * Within red:
             * unreviewed entries come before declined entries.
             */
            if (
              statePriority(
                aState,
              ) ===
                0 &&
              aState !==
                bState
            ) {
              if (
                aState ===
                "unreviewed"
              ) {
                return -1;
              }

              if (
                bState ===
                "unreviewed"
              ) {
                return 1;
              }
            }

            /*
             * Newest first inside each colour group.
             */
            return (
              new Date(
                b.submitted_at,
              ).getTime() -
              new Date(
                a.submitted_at,
              ).getTime()
            );
          },
        );

        return list;
      },

      [
        submissions,
        filter,
        q,
      ],
    );

  const unreviewedCount =
    useMemo(
      () =>
        (
          submissions ??
          []
        ).filter(
          (
            submission,
          ) =>
            responseCardState(
              submission,
            ) ===
            "unreviewed",
        ).length,
      [
        submissions,
      ],
    );

  /* ==========================================================
   * NEXT IN LINE
   * ======================================================== */

  const nextRows =
    useMemo(
      () => {
        let list =
          nextInLine ??
          [];

        const term =
          q
            .trim()
            .toLowerCase();

        if (term) {
          list =
            list.filter(
              (
                row,
              ) =>
                row.country
                  .toLowerCase()
                  .includes(
                    term,
                  ) ||

                (
                  row.artist ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    term,
                  ) ||

                (
                  row.song_title ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    term,
                  ),
            );
        }

        return list;
      },

      [
        nextInLine,
        q,
      ],
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl sm:text-4xl">
          Responses
        </h1>

        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {scope.isNextInLine
            ? "Next in Line responses for the selected edition."
            : "Combined view of every confirmation in the selected scope."}
        </p>
      </header>

      <ScopePicker
        scope={
          scope
        }
        editions={
          editions
        }
      />

      {scope.isNextInLine ? (
        <>
          {/* ==================================================
           * NEXT IN LINE
           * ================================================ */}

          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              className="h-11 pl-9"
              placeholder="Search country or song"
              value={
                q
              }
              onChange={(
                event,
              ) =>
                setQ(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-accent">
              Next in Line
            </p>

            <h2 className="mt-1 text-2xl">
              Entries
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {nextLoading
                ? "Loading responses…"
                : `${nextRows.length} ${
                    nextRows.length ===
                    1
                      ? "response"
                      : "responses"
                  }`}
            </p>
          </div>

          {/* MOBILE NEXT IN LINE */}

          <div className="space-y-3 sm:hidden">
            {nextRows.map(
              (
                row,
              ) => (
                <div
                  key={
                    row.id
                  }
                  className="surface p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl">
                        {
                          row.country
                        }
                      </h3>

                      <p
                        className={cn(
                          "mt-1 text-sm font-medium",

                          row.participating
                            ? "text-success"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.participating
                          ? "Would participate"
                          : "Would not participate"}
                      </p>
                    </div>
                  </div>

                  {row.participating ? (
                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Method
                        </p>

                        <p className="mt-1 text-sm capitalize">
                          {row.entry_unknown
                            ? "Unknown"
                            : row.selection_type.replace(
                                "_",
                                " ",
                              )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Status
                        </p>

                        <p className="mt-1 text-sm">
                          {row.entry_unknown
                            ? "Entry unknown"
                            : "Complete"}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Entry
                        </p>

                        <p className="mt-1 text-sm">
                          {row.entry_unknown
                            ? "Not known yet"
                            : row.song_title
                              ? `${row.artist ?? "Unknown artist"} — ${row.song_title}`
                              : "—"}
                        </p>
                      </div>

                      {!row.entry_unknown &&
                      row.preview_start ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Preview
                          </p>

                          <p className="mt-1 text-sm">
                            {
                              row.preview_start
                            }

                            {row.preview_end
                              ? ` – ${row.preview_end}`
                              : ""}
                          </p>
                        </div>
                      ) : null}

                      {row.song_url ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Song
                          </p>

                          <a
                            href={
                              row.song_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-sm text-accent"
                          >
                            Open

                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />

                    Submitted{" "}

                    {new Date(
                      row.submitted_at,
                    ).toLocaleDateString()}
                  </div>
                </div>
              ),
            )}

            {nextRows.length ===
            0 ? (
              <div className="surface p-8 text-center text-sm text-muted-foreground">
                {nextLoading
                  ? "Loading…"
                  : "No Next in Line responses yet."}
              </div>
            ) : null}
          </div>

          {/* DESKTOP NEXT IN LINE */}

          <div className="surface hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3">
                      Country
                    </th>

                    <th className="px-4 py-3">
                      Participate
                    </th>

                    <th className="px-4 py-3">
                      Method
                    </th>

                    <th className="px-4 py-3">
                      Entry
                    </th>

                    <th className="px-4 py-3">
                      Preview
                    </th>

                    <th className="px-4 py-3">
                      Submitted
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {nextRows.map(
                    (
                      row,
                    ) => (
                      <tr
                        key={
                          row.id
                        }
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">
                          {
                            row.country
                          }
                        </td>

                        <td className="px-4 py-3">
                          {row.participating
                            ? "Yes"
                            : "No"}
                        </td>

                        <td className="px-4 py-3 capitalize">
                          {!row.participating
                            ? "—"
                            : row.entry_unknown
                              ? "Unknown"
                              : row.selection_type.replace(
                                  "_",
                                  " ",
                                )}
                        </td>

                        <td className="px-4 py-3">
                          {row.entry_unknown
                            ? "Not known yet"
                            : row.song_title
                              ? `${row.artist ?? ""} — ${row.song_title}`
                              : "—"}
                        </td>

                        <td className="px-4 py-3">
                          {row.preview_start
                            ? `${row.preview_start}${row.preview_end ? ` – ${row.preview_end}` : ""}`
                            : "—"}
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(
                            row.submitted_at,
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ),
                  )}

                  {nextRows.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={
                          6
                        }
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No Next in Line responses yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ==================================================
           * NORMAL CONFIRMATIONS
           * ================================================ */}

          {unreviewedCount >
          0 ? (
            <button
              type="button"
              onClick={() =>
                setFilter(
                  "Unreviewed",
                )
              }
              className="w-full rounded-xl border border-destructive/70 bg-destructive/10 px-4 py-3 text-left shadow-[0_0_14px_rgba(239,68,68,0.35),0_0_32px_rgba(239,68,68,0.16)] transition hover:bg-destructive/15"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <CircleAlert className="size-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-destructive">
                    {unreviewedCount}{" "}

                    {unreviewedCount ===
                    1
                      ? "response needs"
                      : "responses need"}{" "}

                    review
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    These responses
                    are shown first.
                  </p>
                </div>
              </div>
            </button>
          ) : null}

          <div className="space-y-3">
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
              <div className="flex w-max gap-2">
                {FILTERS.map(
                  (
                    item,
                  ) => (
                    <button
                      key={
                        item
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          item,
                        )
                      }
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors",

                        filter ===
                          item
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-white/12 bg-white/5 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {
                        item
                      }

                      {item ===
                        "Unreviewed" &&
                      unreviewedCount >
                        0
                        ? ` (${unreviewedCount})`
                        : ""}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="h-11 pl-9"
                placeholder="Search country, user or song"
                value={
                  q
                }
                onChange={(
                  event,
                ) =>
                  setQ(
                    event.target
                      .value,
                  )
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Loading responses…"
              : `${rows.length} ${
                  rows.length ===
                  1
                    ? "response"
                    : "responses"
                }`}
          </p>

          {/* MOBILE */}

          <div className="space-y-4 sm:hidden">
            {rows.map(
              (
                submission,
              ) => {
                const cardState =
                  responseCardState(
                    submission,
                  );

                const entry =
                  submission
                    .internal_entries
                    ?.song_title
                    ? `${submission.internal_entries.artist} — ${submission.internal_entries.song_title}`
                    : submission
                          .national_finals
                          ?.nf_name
                      ? `${submission.national_finals.nf_name} (${activeNfEntries(submission).length})`
                      : "Not submitted";

                const method =
                  submission.participating
                    ? (
                        submission.selection_method ??
                        "unknown"
                      ).replace(
                        "_",
                        " ",
                      )
                    : "Not participating";

                const status =
                  statusOf(
                    submission,
                  );

                return (
                  <Link
                    key={
                      submission.id
                    }
                    to="/admin/responses/$id"
                    params={{
                      id:
                        submission.id,
                    }}
                    className={cn(
                      "surface relative block overflow-hidden p-5 transition-all active:scale-[0.985]",

                      mobileCardClasses(
                        cardState,
                      ),
                    )}
                  >
                    {cardState ===
                      "unreviewed" ||
                    cardState ===
                      "declined" ? (
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_65%)]" />
                    ) : null}

                    {cardState ===
                    "nf_issue" ? (
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.16),transparent_65%)]" />
                    ) : null}

                    {cardState ===
                    "accepted" ? (
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.15),transparent_65%)]" />
                    ) : null}

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl">
                              {
                                submission.country
                              }
                            </h2>

                            {stateBadge(
                              cardState,
                            )}
                          </div>

                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            @
                            {
                              submission.instagram_username
                            }
                          </p>
                        </div>

                        <ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Method
                          </p>

                          <p className="mt-1 text-sm capitalize">
                            {
                              method
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Status
                          </p>

                          <p className="mt-1 text-sm">
                            {
                              status
                            }
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Entry
                          </p>

                          <p className="mt-1 text-sm">
                            {
                              entry
                            }
                          </p>
                        </div>

                        <div className="col-span-2 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />

                          Submitted{" "}

                          {new Date(
                            submission.submitted_at,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              },
            )}

            {rows.length ===
              0 &&
            !isLoading ? (
              <div className="surface p-8 text-center text-sm text-muted-foreground">
                No responses match this filter.
              </div>
            ) : null}
          </div>

          {/* DESKTOP */}

          <div className="hidden space-y-3 sm:block">
            {rows.map(
              (
                submission,
              ) => {
                const cardState =
                  responseCardState(
                    submission,
                  );

                const entry =
                  submission
                    .internal_entries
                    ?.song_title
                    ? `${submission.internal_entries.artist} — ${submission.internal_entries.song_title}`
                    : submission
                          .national_finals
                          ?.nf_name
                      ? `${submission.national_finals.nf_name} (${activeNfEntries(submission).length})`
                      : "Not submitted";

                const method =
                  submission.participating
                    ? (
                        submission.selection_method ??
                        "unknown"
                      ).replace(
                        "_",
                        " ",
                      )
                    : "Not participating";

                return (
                  <Link
                    key={
                      submission.id
                    }
                    to="/admin/responses/$id"
                    params={{
                      id:
                        submission.id,
                    }}
                    className={cn(
                      "surface relative block overflow-hidden border p-5 transition-all hover:-translate-y-[1px]",

                      cardState ===
                        "normal"
                        ? "border-border"
                        : "",

                      mobileCardClasses(
                        cardState,
                      ),
                    )}
                  >
                    <div className="flex items-center justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-medium">
                            {
                              submission.country
                            }
                          </h2>

                          {stateBadge(
                            cardState,
                          )}

                          <span className="text-xs text-muted-foreground">
                            @
                            {
                              submission.instagram_username
                            }
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-[160px_1fr_160px] gap-5 text-sm">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Method
                            </p>

                            <p className="mt-1 capitalize">
                              {
                                method
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Entry
                            </p>

                            <p className="mt-1 truncate">
                              {
                                entry
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Submitted
                            </p>

                            <p className="mt-1">
                              {new Date(
                                submission.submitted_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                    </div>
                  </Link>
                );
              },
            )}

            {rows.length ===
              0 &&
            !isLoading ? (
              <div className="surface p-8 text-center text-sm text-muted-foreground">
                No responses match this filter.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
