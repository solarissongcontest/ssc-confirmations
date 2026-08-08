import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

import {
  getPublicRounds,
  type PublicRound,
} from "@/lib/public.functions";

import { ConfirmationForm } from "@/components/ConfirmationForm";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import {
  availabilityBadge,
  computeAvailability,
} from "@/lib/ssc";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Solaris Song Contest — Participation Confirmations",
      },
      {
        name: "description",
        content:
          "Confirm your delegation's participation, choose your selection method and submit your song for the Solaris Song Contest.",
      },
      {
        property: "og:title",
        content:
          "Solaris Song Contest — Participation Confirmations",
      },
      {
        property: "og:description",
        content:
          "Confirm your delegation's participation, choose your selection method and submit your song.",
      },
    ],
  }),

  loader: () =>
    getPublicRounds(),

  component: Index,
});

function StateBadge({
  state,
}: {
  state: string;
}) {
  const label =
    state === "open"
      ? "OPEN"
      : state === "full"
        ? "FULL"
        : state === "scheduled"
          ? "OPENS SOON"
          : "CLOSED";

  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold tracking-widest",

        state === "open"
          ? "bg-success/15 text-success"
          : state === "full"
            ? "bg-warning/15 text-warning"
            : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function Index() {
  const initial: PublicRound[] =
    Route.useLoaderData();

  const [
    rounds,
    setRounds,
  ] = useState<PublicRound[]>(
    initial,
  );

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  /* ==========================================================
   * LIVE ROUND UPDATES
   * ======================================================== */

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "public-rounds",
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "round_stats",
          },
          (payload) => {
            const row =
              payload.new as {
                round_id?: string;
                submitted_count?: number;
              };

            if (
              !row?.round_id
            ) {
              return;
            }

            setRounds(
              (list) =>
                list.map(
                  (r) =>
                    r.id ===
                    row.round_id
                      ? {
                          ...r,

                          response_count:
                            row.submitted_count ??
                            r.response_count,
                        }
                      : r,
                ),
            );
          },
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "submission_rounds",
          },
          (payload) => {
            const row =
              payload.new as Partial<PublicRound> & {
                id?: string;
              };

            if (!row?.id) {
              return;
            }

            setRounds(
              (list) =>
                list.map(
                  (r) =>
                    r.id ===
                    row.id
                      ? {
                          ...r,
                          ...row,
                        }
                      : r,
                ),
            );
          },
        )

        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, []);

  /* ==========================================================
   * RECHECK SCHEDULED OPEN / CLOSE TIMES
   * ======================================================== */

  const [, setTick] =
    useState(0);

  useEffect(() => {
    const timer =
      setInterval(
        () =>
          setTick(
            (n) =>
              n + 1,
          ),
        15_000,
      );

    return () =>
      clearInterval(
        timer,
      );
  }, []);

  /* ==========================================================
   * ROUND STATE
   * ======================================================== */

  const reasonOf = (
    round: PublicRound,
  ) =>
    computeAvailability({
      status:
        round.status,

      count:
        round.response_count,

      limit:
        round.response_limit,

      opens_at:
        round.opens_at,

      closes_at:
        round.closes_at,
    });

  const stateOf = (
    round: PublicRound,
  ) =>
    availabilityBadge(
      reasonOf(round),
    );

  const setSelected = (
    round:
      | PublicRound
      | null,
  ) =>
    setSelectedId(
      round?.id ??
        null,
    );

  const selected =
    rounds.find(
      (round) =>
        round.id ===
        selectedId,
    ) ?? null;

  const openRounds =
    rounds.filter(
      (round) =>
        stateOf(
          round,
        ) === "open",
    );

  const active =
    selected ??
    (openRounds.length ===
    1
      ? openRounds[0]!
      : null);

  /* ==========================================================
   * PAGE
   * ======================================================== */

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      {/* ------------------------------------------------------
       * HERO
       * ---------------------------------------------------- */}

      <header className="mb-10 text-center">
        <h1 className="text-solar text-4xl font-normal sm:text-6xl">
          Solaris Song Contest
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Confirm your
          participation and
          submit your entry. It
          only takes a couple of
          minutes.
        </p>
      </header>

      {/* ------------------------------------------------------
       * NO ROUNDS
       * ---------------------------------------------------- */}

      {rounds.length ===
      0 ? (
        <div className="surface p-8 text-center">
          <h2 className="text-lg">
            No submission rounds
            are available
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Confirmations are
            currently closed.
            Please check back
            later.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------
       * ROUND CHOOSER
       * ---------------------------------------------------- */}

      {!active &&
      rounds.length >
        0 ? (
        <div className="space-y-3">
          {rounds.map(
            (round) => {
              const state =
                stateOf(
                  round,
                );

              return (
                <button
                  key={
                    round.id
                  }
                  type="button"
                  disabled={
                    state !==
                    "open"
                  }
                  onClick={() =>
                    setSelected(
                      round,
                    )
                  }
                  className={cn(
                    "surface block w-full p-5 text-left transition-transform",

                    state ===
                    "open"
                      ? "hover:-translate-y-0.5"
                      : "opacity-70",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {
                          round.edition_name
                        }
                      </p>

                      <h2 className="mt-1 text-xl">
                        {
                          round.name
                        }
                      </h2>
                    </div>

                    <StateBadge
                      state={
                        state
                      }
                    />
                  </div>

                  {round.response_limit ? (
                    <div className="mt-4">
                      <Progress
                        value={
                          (round.response_count /
                            round.response_limit) *
                          100
                        }
                        className="h-1.5"
                      />

                      <p className="mt-2 text-xs text-muted-foreground">
                        {
                          round.response_count
                        }{" "}
                        /{" "}
                        {
                          round.response_limit
                        }{" "}
                        spots filled
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {
                        round.response_count
                      }{" "}
                      responses
                      received
                    </p>
                  )}

                  {state ===
                  "full" ? (
                    <p className="mt-3 text-xs text-warning">
                      This
                      confirmation
                      round has
                      reached its
                      maximum number
                      of
                      submissions.
                    </p>
                  ) : null}

                  {state ===
                  "closed" ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Confirmations
                      are currently
                      closed.
                    </p>
                  ) : null}
                </button>
              );
            },
          )}
        </div>
      ) : null}

      {/* ------------------------------------------------------
       * ACTIVE ROUND
       * ---------------------------------------------------- */}

      {active ? (
        <div className="space-y-6">
          <div className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {
                    active.edition_name
                  }
                </p>

                <h2 className="mt-1 text-2xl">
                  {
                    active.name
                  }
                </h2>
              </div>

              <StateBadge
                state={stateOf(
                  active,
                )}
              />
            </div>

            {active.response_limit ? (
              <div className="mt-4">
                <Progress
                  value={
                    (active.response_count /
                      active.response_limit) *
                    100
                  }
                  className="h-1.5"
                />

                <p className="mt-2 text-xs text-muted-foreground">
                  {
                    active.response_count
                  }{" "}
                  /{" "}
                  {
                    active.response_limit
                  }{" "}
                  spots filled
                </p>
              </div>
            ) : null}

            {rounds.length >
            1 ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
                onClick={() =>
                  setSelected(
                    null,
                  )
                }
              >
                Choose a different
                round
              </Button>
            ) : null}
          </div>

          <ConfirmationForm
            round={
              active
            }
            availability={reasonOf(
              active,
            )}
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------
       * FOOTER
       * ---------------------------------------------------- */}

      <footer className="mt-12 text-center">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Lock className="size-3" />

          Organiser access
        </Link>
      </footer>
    </main>
  );
}
