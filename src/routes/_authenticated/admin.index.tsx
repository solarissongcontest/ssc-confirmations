import {
  createFileRoute,
} from "@tanstack/react-router";

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

export const Route =
  createFileRoute(
    "/_authenticated/admin/",
  )({
    component:
      StatsPage,
  });

function Card({
  label,
  value,
  hint,
}: {
  label: string;

  value: string;

  hint?: string;
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

  const participating =
    rows.filter(
      (
        r,
      ) =>
        r.participating,
    );

  const internal =
    participating.filter(
      (
        r,
      ) =>
        r.selection_method ===
        "internal",
    );

  const nf =
    participating.filter(
      (
        r,
      ) =>
        r.selection_method ===
        "national_final",
    );

  const unknown =
    participating.filter(
      (
        r,
      ) =>
        !r.selection_method ||
        r.selection_method ===
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
        r,
      ) => {
        const status =
          statusOf(
            r,
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

  /* NEXT IN LINE */

  const nextRows =
    nextInLine ??
    [];

  const nextYes =
    nextRows.filter(
      (
        r,
      ) =>
        r.participating,
    );

  const nextNo =
    nextRows.filter(
      (
        r,
      ) =>
        !r.participating,
    );

  const nextKnown =
    nextYes.filter(
      (
        r,
      ) =>
        !r.entry_unknown,
    );

  const nextUnknown =
    nextYes.filter(
      (
        r,
      ) =>
        r.entry_unknown,
    );

  const nextInternal =
    nextKnown.filter(
      (
        r,
      ) =>
        r.selection_type ===
        "internal",
    );

  const nextNF =
    nextKnown.filter(
      (
        r,
      ) =>
        r.selection_type ===
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
            : "Live overview of confirmations for the selected round."}
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

          <div className="surface p-4 sm:p-5">
            <h2 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Entry statuses
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
                  No
                  responses
                  yet.
                </li>
              ) : null}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
