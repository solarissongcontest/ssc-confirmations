import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Music2,
  ShieldCheck,
  Trash2,
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
} from "@/lib/adminModel";

import {
  Progress,
} from "@/components/ui/progress";

import {
  ScopePicker,
} from "@/components/admin/ScopePicker";

import {
  cn,
} from "@/lib/utils";

export const Route =
  createFileRoute(
    "/_authenticated/admin/",
  )({
    component:
      StatsPage,
  });

/* ============================================================
 * GENERIC STAT CARD
 * ========================================================== */

function Card({
  label,
  value,
  hint,
}: {
  label:
    string;

  value:
    string;

  hint?:
    string;
}) {
  return (
    <div className="surface min-w-0 p-3 sm:p-4">
      <p className="truncate text-[9px] uppercase tracking-[0.11em] text-muted-foreground sm:text-xs sm:tracking-widest">
        {label}
      </p>

      <p className="mt-1.5 text-xl font-medium sm:mt-2 sm:text-2xl">
        {value}
      </p>

      {hint ? (
        <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ============================================================
 * MODERATION CARD
 * ========================================================== */

type ModerationTone =
  | "normal"
  | "green"
  | "red"
  | "yellow";

function ModerationCard({
  label,
  value,
  hint,
  tone = "normal",
  icon,
}: {
  label:
    string;

  value:
    number;

  hint?:
    string;

  tone?:
    ModerationTone;

  icon:
    React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "surface min-w-0 border p-4",

        tone ===
          "green"
          ? "border-success/40 bg-success/10 shadow-[0_0_20px_rgba(34,197,94,0.10)]"
          : tone ===
              "red"
            ? "border-destructive/45 bg-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.11)]"
            : tone ===
                "yellow"
              ? "border-warning/45 bg-warning/10 shadow-[0_0_20px_rgba(234,179,8,0.10)]"
              : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10px] uppercase tracking-[0.12em]",

              tone ===
                "green"
                ? "text-success"
                : tone ===
                    "red"
                  ? "text-destructive"
                  : tone ===
                      "yellow"
                    ? "text-warning"
                    : "text-muted-foreground",
            )}
          >
            {label}
          </p>

          <p className="mt-2 text-3xl font-medium">
            {value}
          </p>
        </div>

        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",

            tone ===
              "green"
              ? "bg-success/15 text-success"
              : tone ===
                  "red"
                ? "bg-destructive/15 text-destructive"
                : tone ===
                    "yellow"
                  ? "bg-warning/15 text-warning"
                  : "bg-secondary text-muted-foreground",
          )}
        >
          {icon}
        </div>
      </div>

      {hint ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ============================================================
 * PAGE
 * ========================================================== */

function StatsPage() {
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
  } =
    useNextInLineSubmissions(
      scope.editionId ||
        undefined,
    );

  const rows =
    submissions ??
    [];

  /* ==========================================================
   * BASIC CONFIRMATION STATS
   * ======================================================== */

  const participating =
    rows.filter(
      (
        row,
      ) =>
        row.participating,
    );

  const internal =
    participating.filter(
      (
        row,
      ) =>
        row.selection_method ===
        "internal",
    );

  const nf =
    participating.filter(
      (
        row,
      ) =>
        row.selection_method ===
        "national_final",
    );

  const unknown =
    participating.filter(
      (
        row,
      ) =>
        !row.selection_method ||
        row.selection_method ===
          "unknown",
    );

  const songs =
    participating.filter(
      songSubmitted,
    );

  const limit =
    scope.round
      ?.response_limit ??
    null;

  const statusCounts =
    rows.reduce<
      Record<
        string,
        number
      >
    >(
      (
        acc,
        row,
      ) => {
        const status =
          statusOf(
            row,
          );

        acc[
          status
        ] =
          (
            acc[
              status
            ] ??
            0
          ) + 1;

        return acc;
      },

      {},
    );

  /* ==========================================================
   * MODERATION / REVIEW STATS
   * ======================================================== */

  const internalEntries =
    participating
      .map(
        (
          row,
        ) =>
          row.internal_entries,
      )
      .filter(
        Boolean,
      );

  const nationalFinalEntries =
    participating.flatMap(
      (
        row,
      ) =>
        row
          .national_finals
          ?.national_final_entries ??
        [],
    );

  /*
   * Total actual songs/entries submitted.
   *
   * Internal = one song.
   * NF = every individual NF entry.
   */
  const totalEntries =
    internalEntries.length +
    nationalFinalEntries.length;

  /* INTERNAL SONGS */

  const acceptedInternal =
    internalEntries.filter(
      (
        entry,
      ) =>
        entry
          ?.review_status ===
        "accepted",
    ).length;

  const declinedInternal =
    internalEntries.filter(
      (
        entry,
      ) =>
        entry
          ?.review_status ===
        "declined",
    ).length;

  const pendingInternal =
    internalEntries.filter(
      (
        entry,
      ) =>
        !entry
          ?.review_status ||
        entry.review_status ===
          "pending",
    ).length;

  /* NF SONGS */

  const acceptedNfEntries =
    nationalFinalEntries.filter(
      (
        entry,
      ) =>
        !entry.removed &&
        entry.review_status ===
          "accepted",
    ).length;

  const declinedNfEntries =
    nationalFinalEntries.filter(
      (
        entry,
      ) =>
        !entry.removed &&
        entry.review_status ===
          "declined",
    ).length;

  const removedNfEntries =
    nationalFinalEntries.filter(
      (
        entry,
      ) =>
        entry.removed ||
        entry.review_status ===
          "removed",
    ).length;

  const pendingNfEntries =
    nationalFinalEntries.filter(
      (
        entry,
      ) =>
        !entry.removed &&
        (
          !entry.review_status ||
          entry.review_status ===
            "pending"
        ),
    ).length;

  /* ALL SONGS */

  const acceptedEntries =
    acceptedInternal +
    acceptedNfEntries;

  const declinedEntries =
    declinedInternal +
    declinedNfEntries;

  const pendingEntries =
    pendingInternal +
    pendingNfEntries;

  /*
   * COUNTRY-LEVEL REVIEW STATE
   */

  const countriesAccepted =
    participating.filter(
      (
        row,
      ) => {
        if (
          !songSubmitted(
            row,
          )
        ) {
          return false;
        }

        if (
          row.selection_method ===
          "internal"
        ) {
          return (
            row
              .internal_entries
              ?.review_status ===
            "accepted"
          );
        }

        if (
          row.selection_method ===
          "national_final"
        ) {
          const entries =
            row
              .national_finals
              ?.national_final_entries ??
            [];

          const activeEntries =
            entries.filter(
              (
                entry,
              ) =>
                !entry.removed,
            );

          return (
            activeEntries.length >
              0 &&
            activeEntries.every(
              (
                entry,
              ) =>
                entry.review_status ===
                "accepted",
            ) &&
            !entries.some(
              (
                entry,
              ) =>
                entry.removed ||
                entry.review_status ===
                  "removed" ||
                entry.review_status ===
                  "declined",
            )
          );
        }

        return false;
      },
    ).length;

  const countriesNeedReview =
    participating.filter(
      (
        row,
      ) => {
        if (
          !songSubmitted(
            row,
          )
        ) {
          return false;
        }

        if (
          row.selection_method ===
          "internal"
        ) {
          return (
            !row
              .internal_entries
              ?.review_status ||
            row
              .internal_entries
              ?.review_status ===
              "pending"
          );
        }

        if (
          row.selection_method ===
          "national_final"
        ) {
          const entries =
            row
              .national_finals
              ?.national_final_entries ??
            [];

          /*
           * A declined/removed NF entry is already reviewed,
           * so it belongs to "NF issues", not "needs review".
           */
          return entries.some(
            (
              entry,
            ) =>
              !entry.removed &&
              (
                !entry.review_status ||
                entry.review_status ===
                  "pending"
              ),
          );
        }

        return false;
      },
    ).length;

  const countriesInternalDeclined =
    participating.filter(
      (
        row,
      ) =>
        row.selection_method ===
          "internal" &&
        row
          .internal_entries
          ?.review_status ===
          "declined",
    ).length;

  const countriesWithNfIssues =
    participating.filter(
      (
        row,
      ) =>
        row.selection_method ===
          "national_final" &&
        (
          row
            .national_finals
            ?.national_final_entries ??
          []
        ).some(
          (
            entry,
          ) =>
            entry.removed ||
            entry.review_status ===
              "removed" ||
            entry.review_status ===
              "declined",
        ),
    ).length;

  const countriesWithoutEntry =
    participating.filter(
      (
        row,
      ) =>
        !songSubmitted(
          row,
        ),
    ).length;

  const reviewedEntries =
    acceptedEntries +
    declinedEntries +
    removedNfEntries;

  const reviewProgress =
    totalEntries
      ? Math.round(
          (
            reviewedEntries /
            totalEntries
          ) *
            100,
        )
      : 0;

  /* ==========================================================
   * NEXT IN LINE
   * ======================================================== */

  const nextRows =
    nextInLine ??
    [];

  const nextYes =
    nextRows.filter(
      (
        row,
      ) =>
        row.participating,
    );

  const nextNo =
    nextRows.filter(
      (
        row,
      ) =>
        !row.participating,
    );

  const nextKnown =
    nextYes.filter(
      (
        row,
      ) =>
        !row.entry_unknown,
    );

  const nextUnknown =
    nextYes.filter(
      (
        row,
      ) =>
        row.entry_unknown,
    );

  const nextInternal =
    nextKnown.filter(
      (
        row,
      ) =>
        row.selection_type ===
        "internal",
    );

  const nextNF =
    nextKnown.filter(
      (
        row,
      ) =>
        row.selection_type ===
        "national_final",
    );

  const rate =
    nextRows.length
      ? Math.round(
          (
            nextYes.length /
            nextRows.length
          ) *
            100,
        )
      : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-3xl sm:text-4xl">
          Statistics
        </h1>

        <p className="mt-1.5 text-sm text-muted-foreground">
          {scope.isNextInLine
            ? "Live overview of Next in Line responses."
            : "Live overview of confirmations and entry moderation for the selected round."}
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
       * NEXT IN LINE STATS
       * ==================================================== */}

      {scope.isNextInLine ? (
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-accent">
              Next in Line
            </p>

            <h2 className="mt-1 text-2xl">
              Statistics
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <Card
              label="Responses"
              value={String(
                nextRows.length,
              )}
            />

            <Card
              label="Would participate"
              value={String(
                nextYes.length,
              )}
            />

            <Card
              label="Would not participate"
              value={String(
                nextNo.length,
              )}
            />

            <Card
              label="Participation rate"
              value={`${rate}%`}
            />

            <Card
              label="Known entries"
              value={String(
                nextKnown.length,
              )}
            />

            <Card
              label="Entry unknown"
              value={String(
                nextUnknown.length,
              )}
            />

            <Card
              label="Internal"
              value={String(
                nextInternal.length,
              )}
            />

            <Card
              label="National Finals"
              value={String(
                nextNF.length,
              )}
            />
          </div>

          <div className="surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Participation
                </p>

                <p className="mt-1 text-lg font-medium">
                  {
                    nextYes.length
                  }{" "}
                  yes ·{" "}
                  {
                    nextNo.length
                  }{" "}
                  no
                </p>
              </div>

              <p className="text-2xl font-medium">
                {rate}%
              </p>
            </div>

            <Progress
              value={
                rate
              }
              className="mt-3 h-1.5"
            />
          </div>
        </>
      ) : (
        <>
          {/* ==================================================
           * NORMAL ROUND STATS
           * ================================================ */}

          {limit ? (
            <div className="surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Capacity
                  </p>

                  <p className="mt-1 text-lg font-medium">
                    {
                      rows.length
                    }{" "}
                    /{" "}
                    {
                      limit
                    }
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Remaining
                  </p>

                  <p className="mt-1 text-lg font-medium">
                    {Math.max(
                      limit -
                        rows.length,
                      0,
                    )}
                  </p>
                </div>
              </div>

              <Progress
                value={
                  (
                    rows.length /
                    limit
                  ) *
                  100
                }
                className="mt-3 h-1.5"
              />
            </div>
          ) : null}

          {/* BASIC PARTICIPATION */}

          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-accent">
              Confirmations
            </p>

            <h2 className="mt-1 text-2xl">
              Participation
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <Card
              label="Responses"
              value={
                limit
                  ? `${rows.length} / ${limit}`
                  : String(
                      rows.length,
                    )
              }
            />

            <Card
              label="Participating"
              value={String(
                participating.length,
              )}
            />

            <Card
              label="Not participating"
              value={String(
                rows.length -
                  participating.length,
              )}
            />

            <Card
              label="Internal"
              value={String(
                internal.length,
              )}
            />

            <Card
              label="National finals"
              value={String(
                nf.length,
              )}
            />

            <Card
              label="Unknown selection"
              value={String(
                unknown.length,
              )}
            />

            <Card
              label="Songs submitted"
              value={String(
                songs.length,
              )}
            />

            <Card
              label="Songs missing"
              value={String(
                participating.length -
                  songs.length,
              )}
            />
          </div>

          {/* ==================================================
           * REVIEW & MODERATION
           * ================================================ */}

          <div className="pt-2">
            <p className="text-xs uppercase tracking-[0.14em] text-accent">
              Review & moderation
            </p>

            <h2 className="mt-1 text-2xl">
              Country status
            </h2>

            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Country-level status based
              on the review state of
              submitted internal and
              National Final entries.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
            <ModerationCard
              label="Need review"
              value={
                countriesNeedReview
              }
              hint="Submitted entries still pending"
              tone="red"
              icon={
                <CircleAlert className="size-4" />
              }
            />

            <ModerationCard
              label="No entry yet"
              value={
                countriesWithoutEntry
              }
              hint="Participating but no song submitted"
              icon={
                <Clock3 className="size-4" />
              }
            />

            <ModerationCard
              label="Entry declined"
              value={
                countriesInternalDeclined
              }
              hint="Internal entry rejected"
              tone="red"
              icon={
                <XCircle className="size-4" />
              }
            />

            <ModerationCard
              label="NF issues"
              value={
                countriesWithNfIssues
              }
              hint="At least one NF song declined or removed"
              tone="yellow"
              icon={
                <CircleAlert className="size-4" />
              }
            />

            <ModerationCard
              label="Fully accepted"
              value={
                countriesAccepted
              }
              hint="All submitted entries approved"
              tone="green"
              icon={
                <ShieldCheck className="size-4" />
              }
            />
          </div>

          {/* REVIEW PROGRESS */}

          <div className="surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Song review progress
                </p>

                <p className="mt-1 text-lg font-medium">
                  {
                    reviewedEntries
                  }{" "}
                  /{" "}
                  {
                    totalEntries
                  }{" "}
                  reviewed
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Counts individual
                  internal songs and
                  every National Final
                  entry.
                </p>
              </div>

              <p className="text-2xl font-medium">
                {
                  reviewProgress
                }
                %
              </p>
            </div>

            <Progress
              value={
                reviewProgress
              }
              className="mt-3 h-1.5"
            />
          </div>

          {/* SONG / ENTRY MODERATION */}

          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-accent">
              Songs & entries
            </p>

            <h2 className="mt-1 text-2xl">
              Review results
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <ModerationCard
              label="Total entries"
              value={
                totalEntries
              }
              hint="Internal + every NF song"
              icon={
                <Music2 className="size-4" />
              }
            />

            <ModerationCard
              label="Accepted"
              value={
                acceptedEntries
              }
              hint="All accepted songs"
              tone="green"
              icon={
                <CheckCircle2 className="size-4" />
              }
            />

            <ModerationCard
              label="Pending"
              value={
                pendingEntries
              }
              hint="Still waiting for review"
              tone="red"
              icon={
                <Clock3 className="size-4" />
              }
            />

            <ModerationCard
              label="Declined"
              value={
                declinedEntries
              }
              hint="Declined songs"
              tone="red"
              icon={
                <XCircle className="size-4" />
              }
            />

            <ModerationCard
              label="Removed NF songs"
              value={
                removedNfEntries
              }
              hint="Removed from a National Final"
              tone="yellow"
              icon={
                <Trash2 className="size-4" />
              }
            />

            <ModerationCard
              label="Accepted internal"
              value={
                acceptedInternal
              }
              hint="Approved internal entries"
              tone="green"
              icon={
                <CheckCircle2 className="size-4" />
              }
            />

            <ModerationCard
              label="Declined internal"
              value={
                declinedInternal
              }
              hint="Rejected internal entries"
              tone="red"
              icon={
                <XCircle className="size-4" />
              }
            />

            <ModerationCard
              label="Pending internal"
              value={
                pendingInternal
              }
              hint="Internal entries awaiting review"
              tone="red"
              icon={
                <Clock3 className="size-4" />
              }
            />

            <ModerationCard
              label="Accepted NF songs"
              value={
                acceptedNfEntries
              }
              hint="Approved individual NF entries"
              tone="green"
              icon={
                <CheckCircle2 className="size-4" />
              }
            />

            <ModerationCard
              label="Declined NF songs"
              value={
                declinedNfEntries
              }
              hint="Rejected individual NF entries"
              tone="yellow"
              icon={
                <XCircle className="size-4" />
              }
            />

            <ModerationCard
              label="Pending NF songs"
              value={
                pendingNfEntries
              }
              hint="NF entries awaiting review"
              tone="red"
              icon={
                <Clock3 className="size-4" />
              }
            />
          </div>

          {/* EXISTING ENTRY STATUS BREAKDOWN */}

          <div className="surface p-4 sm:p-5">
            <h2 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Submission statuses
            </h2>

            <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
              {Object.entries(
                statusCounts,
              ).map(
                ([
                  status,
                  count,
                ]) => (
                  <li
                    key={
                      status
                    }
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-3 py-2"
                  >
                    <span className="truncate text-sm">
                      {
                        status
                      }
                    </span>

                    <span className="font-medium">
                      {
                        count
                      }
                    </span>
                  </li>
                ),
              )}

              {Object.keys(
                statusCounts,
              ).length ===
              0 ? (
                <li className="col-span-2 text-sm text-muted-foreground">
                  No responses yet.
                </li>
              ) : null}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
