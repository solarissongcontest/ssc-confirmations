import { createFileRoute } from "@tanstack/react-router";

import {
  useEditions,
  useScope,
  useSubmissions,
} from "@/lib/adminHooks";

import {
  songSubmitted,
  statusOf,
} from "@/lib/adminModel";

import { Progress } from "@/components/ui/progress";
import { ScopePicker } from "@/components/admin/ScopePicker";

export const Route = createFileRoute(
  "/_authenticated/admin/",
)({
  component: StatsPage,
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
    data: editions,
  } = useEditions();

  const scope =
    useScope(editions);

  const {
    data: submissions,
  } = useSubmissions({
    ...(scope.editionId
      ? {
          edition_id:
            scope.editionId,
        }
      : {}),

    ...(scope.roundId
      ? {
          round_id:
            scope.roundId,
        }
      : {}),
  });

  const rows =
    submissions ?? [];

  const participating =
    rows.filter(
      (r) =>
        r.participating,
    );

  const internal =
    participating.filter(
      (r) =>
        r.selection_method ===
        "internal",
    );

  const nf =
    participating.filter(
      (r) =>
        r.selection_method ===
        "national_final",
    );

  const unknown =
    participating.filter(
      (r) =>
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
        const s =
          statusOf(r);

        acc[s] =
          (acc[s] ??
            0) + 1;

        return acc;
      },
      {},
    );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ======================================================
       * HEADER
       * ==================================================== */}

      <header>
        <h1 className="text-3xl sm:text-4xl">
          Statistics
        </h1>

        <p className="mt-1.5 text-sm text-muted-foreground">
          Live overview of confirmations for the selected round.
        </p>
      </header>

      {/* ======================================================
       * SCOPE
       * ==================================================== */}

      <ScopePicker
        scope={scope}
        editions={
          editions
        }
      />

      {/* ======================================================
       * CAPACITY
       * ==================================================== */}

      {limit ? (
        <div className="surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Capacity
              </p>

              <p className="mt-1 text-lg font-medium">
                {rows.length} /{" "}
                {limit}
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
              (rows.length /
                limit) *
              100
            }
            className="mt-3 h-1.5"
          />

          {rows.length >=
          limit ? (
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.1em] text-warning">
              Full / closed
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ======================================================
       * MAIN STATISTICS
       * ==================================================== */}

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

      {/* ======================================================
       * ENTRY STATUSES
       * ==================================================== */}

      <div className="surface p-4 sm:p-5">
        <h2 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Entry statuses
        </h2>

        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2"
              >
                <span className="truncate text-[11px] sm:text-sm">
                  {
                    status
                  }
                </span>

                <span className="shrink-0 text-sm font-medium">
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
    </div>
  );
}
