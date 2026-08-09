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
] as const;

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
   * NORMAL RESULTS
   * ======================================================== */

  const rows =
    useMemo(
      () => {
        /*
         * Copy first so sorting does not mutate React Query's
         * original cached array.
         */
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
                s,
              ) =>
                s.participating,
            );
        }

        if (
          filter ===
          "Not participating"
        ) {
          list =
            list.filter(
              (
                s,
              ) =>
                !s.participating,
            );
        }

        if (
          filter ===
          "Internal"
        ) {
          list =
            list.filter(
              (
                s,
              ) =>
                s.selection_method ===
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
                s,
              ) =>
                s.selection_method ===
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
                s,
              ) =>
                s.participating &&
                !songSubmitted(
                  s,
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
                s,
              ) =>
                !s.reviewed,
            );
        }

        const term =
          q
            .trim()
            .toLowerCase();

        if (term) {
          list =
            list.filter(
              (
                s,
              ) =>
                s.country
                  .toLowerCase()
                  .includes(
                    term,
                  ) ||

                s.instagram_username
                  .toLowerCase()
                  .includes(
                    term,
                  ) ||

                (
                  s
                    .internal_entries
                    ?.song_title ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    term,
                  ) ||

                (
                  s
                    .internal_entries
                    ?.artist ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    term,
                  ) ||

                (
                  s
                    .national_finals
                    ?.nf_name ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    term,
                  ),
            );
        }

        /*
         * UNREVIEWED RESPONSES ALWAYS COME FIRST.
         *
         * Reviewed:
         *   true = 1
         *
         * Unreviewed:
         *   false = 0
         *
         * So false sorts before true.
         *
         * Within each group, newest submissions come first.
         */
        list.sort(
          (
            a,
            b,
          ) => {
            if (
              Boolean(
                a.reviewed,
              ) !==
              Boolean(
                b.reviewed,
              )
            ) {
              return a.reviewed
                ? 1
                : -1;
            }

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
            !submission.reviewed,
        ).length,
      [
        submissions,
      ],
    );

  /* ==========================================================
   * NEXT IN LINE RESULTS
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

      {/* ======================================================
       * NEXT IN LINE VIEW
       * ==================================================== */}

      {scope.isNextInLine ? (
        <>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              className="h-11 pl-9"
              placeholder="Search country or song"
              value={
                q
              }
              onChange={(
                e,
              ) =>
                setQ(
                  e.target
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
                        No Next in
                        Line
                        responses
                        yet.
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
           * NORMAL CONFIRMATION VIEW
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
              className="w-full rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-left shadow-[0_0_24px_rgba(239,68,68,0.22)] transition hover:bg-destructive/15"
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
                    Unreviewed
                    responses are
                    shown first.
                    Tap here to
                    show only
                    those.
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
                          ? item ===
                            "Unreviewed"
                            ? "border-destructive/70 bg-destructive/15 text-destructive shadow-[0_0_14px_rgba(239,68,68,0.20)]"
                            : "border-primary bg-primary/15 text-foreground"
                          : item ===
                              "Unreviewed" &&
                            unreviewedCount >
                              0
                            ? "border-destructive/30 bg-destructive/5 text-destructive"
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
                  e,
                ) =>
                  setQ(
                    e.target
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

          {/* ==================================================
           * MOBILE NORMAL RESPONSES
           * ================================================ */}

          <div className="space-y-3 sm:hidden">
            {rows.map(
              (
                s,
              ) => {
                const entry =
                  s
                    .internal_entries
                    ?.song_title
                    ? `${s.internal_entries.artist} — ${s.internal_entries.song_title}`
                    : s
                          .national_finals
                          ?.nf_name
                      ? `${s.national_finals.nf_name} (${s.national_finals.national_final_entries.length})`
                      : "Not submitted";

                const method =
                  s.participating
                    ? (
                        s.selection_method ??
                        "unknown"
                      ).replace(
                        "_",
                        " ",
                      )
                    : "Not participating";

                const status =
                  statusOf(
                    s,
                  );

                const needsReview =
                  !s.reviewed;

                return (
                  <Link
                    key={
                      s.id
                    }
                    to="/admin/responses/$id"
                    params={{
                      id:
                        s.id,
                    }}
                    className={cn(
                      "surface relative block overflow-hidden p-5 transition-all active:scale-[0.985]",

                      needsReview
                        ? "border border-destructive/70 bg-destructive/10 shadow-[0_0_26px_rgba(239,68,68,0.30)]"
                        : "",
                    )}
                  >
                    {needsReview ? (
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_58%)]" />
                    ) : null}

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className={cn(
                                "text-xl",

                                needsReview
                                  ? "text-destructive"
                                  : "",
                              )}
                            >
                              {
                                s.country
                              }
                            </h2>

                            {needsReview ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-destructive shadow-[0_0_10px_rgba(239,68,68,0.20)]">
                                <CircleAlert className="size-3" />

                                Needs review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-success">
                                <CheckCircle2 className="size-3" />

                                Reviewed
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            @
                            {
                              s.instagram_username
                            }
                          </p>
                        </div>

                        <ArrowRight
                          className={cn(
                            "mt-1 size-5 shrink-0",

                            needsReview
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        />
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

                          <div className="mt-1 flex items-center gap-1.5 text-sm">
                            {songSubmitted(
                              s,
                            ) ? (
                              <CheckCircle2 className="size-3.5 text-success" />
                            ) : (
                              <CircleAlert className="size-3.5 text-muted-foreground" />
                            )}

                            {
                              status
                            }
                          </div>
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

                        <div
                          className={cn(
                            "col-span-2 flex items-center gap-2 border-t pt-3 text-xs",

                            needsReview
                              ? "border-destructive/20 text-destructive/80"
                              : "border-white/10 text-muted-foreground",
                          )}
                        >
                          <CalendarDays className="size-3.5" />

                          Submitted{" "}

                          {new Date(
                            s.submitted_at,
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
                No responses
                match this
                filter.
              </div>
            ) : null}
          </div>

          {/* ==================================================
           * DESKTOP NORMAL RESPONSES
           * ================================================ */}

          <div className="surface hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3">
                      Country
                    </th>

                    <th className="px-4 py-3">
                      Review
                    </th>

                    <th className="px-4 py-3">
                      Instagram
                    </th>

                    <th className="px-4 py-3">
                      Method
                    </th>

                    <th className="px-4 py-3">
                      Entry
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Submitted
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (
                      s,
                    ) => {
                      const needsReview =
                        !s.reviewed;

                      return (
                        <tr
                          key={
                            s.id
                          }
                          className={cn(
                            "relative border-b border-border/60 transition-colors last:border-0",

                            needsReview
                              ? "bg-destructive/10 shadow-[inset_4px_0_0_rgba(239,68,68,0.90),0_0_18px_rgba(239,68,68,0.18)] hover:bg-destructive/15"
                              : "hover:bg-white/[0.025]",
                          )}
                        >
                          <td className="px-4 py-4 font-medium">
                            <Link
                              to="/admin/responses/$id"
                              params={{
                                id:
                                  s.id,
                              }}
                              className={cn(
                                "hover:text-accent",

                                needsReview
                                  ? "font-semibold text-destructive"
                                  : "",
                              )}
                            >
                              {
                                s.country
                              }
                            </Link>
                          </td>

                          <td className="px-4 py-4">
                            {needsReview ? (
                              <Link
                                to="/admin/responses/$id"
                                params={{
                                  id:
                                    s.id,
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive shadow-[0_0_10px_rgba(239,68,68,0.18)]"
                              >
                                <CircleAlert className="size-3.5" />

                                Needs review
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success">
                                <CheckCircle2 className="size-3.5" />

                                Reviewed
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            @
                            {
                              s.instagram_username
                            }
                          </td>

                          <td className="px-4 py-4 capitalize">
                            {s.participating
                              ? (
                                  s.selection_method ??
                                  "unknown"
                                ).replace(
                                  "_",
                                  " ",
                                )
                              : "Not participating"}
                          </td>

                          <td className="px-4 py-4">
                            {s
                              .internal_entries
                              ?.song_title
                              ? `${s.internal_entries.artist} — ${s.internal_entries.song_title}`
                              : s
                                    .national_finals
                                    ?.nf_name
                                ? `${s.national_finals.nf_name} (${s.national_finals.national_final_entries.length})`
                                : "—"}
                          </td>

                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            {
                              statusOf(
                                s,
                              )
                            }
                          </td>

                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            {new Date(
                              s.submitted_at,
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    },
                  )}

                  {rows.length ===
                  0 &&
                  !isLoading ? (
                    <tr>
                      <td
                        colSpan={
                          7
                        }
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No responses
                        match this
                        filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
