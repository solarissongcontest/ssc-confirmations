import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useEffect,
  useState,
} from "react";

import {
  Lock,
} from "lucide-react";

import {
  getPublicRounds,
  type PublicRound,
} from "@/lib/public.functions";

import {
  ConfirmationForm,
} from "@/components/ConfirmationForm";

import {
  Progress,
} from "@/components/ui/progress";

import {
  Button,
} from "@/components/ui/button";

import {
  availabilityBadge,
  computeAvailability,
} from "@/lib/ssc";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  cn,
} from "@/lib/utils";

export const Route =
  createFileRoute("/")({
    head: () => ({
      meta: [
        {
          title:
            "Solaris Song Contest — Participation Confirmations",
        },
        {
          name:
            "description",

          content:
            "Confirm your delegation's participation, choose your selection method and submit your song for the Solaris Song Contest.",
        },
        {
          property:
            "og:title",

          content:
            "Solaris Song Contest — Participation Confirmations",
        },
        {
          property:
            "og:description",

          content:
            "Confirm your delegation's participation, choose your selection method and submit your song.",
        },
      ],
    }),

    loader: () =>
      getPublicRounds(),

    component: Index,
  });

/* ============================================================
 * COUNTDOWN
 * ========================================================== */

function formatCountdown(
  opensAt:
    | string
    | null,
) {
  if (!opensAt) {
    return "OPENS SOON";
  }

  const target =
    new Date(
      opensAt,
    ).getTime();

  const now =
    Date.now();

  const difference =
    target - now;

  if (
    !Number.isFinite(
      target,
    )
  ) {
    return "OPENS SOON";
  }

  if (
    difference <= 0
  ) {
    return "OPENING…";
  }

  const totalSeconds =
    Math.max(
      0,
      Math.floor(
        difference /
          1000,
      ),
    );

  const days =
    Math.floor(
      totalSeconds /
        86400,
    );

  const hours =
    Math.floor(
      (totalSeconds %
        86400) /
        3600,
    );

  const minutes =
    Math.floor(
      (totalSeconds %
        3600) /
        60,
    );

  const seconds =
    totalSeconds %
    60;

  if (days > 0) {
    return `OPENS IN ${days}D ${hours}H ${minutes}M`;
  }

  if (hours > 0) {
    return `OPENS IN ${hours}H ${minutes}M`;
  }

  if (minutes > 0) {
    return `OPENS IN ${minutes}M ${seconds}S`;
  }

  return `OPENS IN ${seconds}S`;
}

/* ============================================================
 * STATE BADGE
 * ========================================================== */

function StateBadge({
  state,
  opensAt,
}: {
  state: string;

  opensAt?:
    | string
    | null;
}) {
  const label =
    state === "open"
      ? "OPEN"
      : state === "full"
        ? "FULL"
        : state ===
            "scheduled"
          ? formatCountdown(
              opensAt ??
                null,
            )
          : "CLOSED";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest",

        state === "open"
          ? "bg-success/15 text-success"
          : state ===
              "full"
            ? "bg-warning/15 text-warning"
            : state ===
                "scheduled"
              ? "bg-accent/15 text-accent"
              : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function Index() {
  const initial:
    PublicRound[] =
    Route.useLoaderData();

  const [
    rounds,
    setRounds,
  ] =
    useState<
      PublicRound[]
    >(initial);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
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

            schema:
              "public",

            table:
              "round_stats",
          },
          (
            payload,
          ) => {
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
              (
                list,
              ) =>
                list.map(
                  (
                    round,
                  ) =>
                    round.id ===
                    row.round_id
                      ? {
                          ...round,

                          response_count:
                            row.submitted_count ??
                            round.response_count,
                        }
                      : round,
                ),
            );
          },
        )

        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "submission_rounds",
          },
          (
            payload,
          ) => {
            const row =
              payload.new as Partial<PublicRound> & {
                id?: string;
              };

            if (
              !row?.id
            ) {
              return;
            }

            setRounds(
              (
                list,
              ) =>
                list.map(
                  (
                    round,
                  ) =>
                    round.id ===
                    row.id
                      ? {
                          ...round,
                          ...row,
                        }
                      : round,
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
   * LIVE COUNTDOWN + SCHEDULED OPEN/CLOSE RECHECK
   *
   * Re-render every second.
   * This updates:
   * - countdown timer
   * - scheduled round opening
   * - scheduled round closing
   * ======================================================== */

  const [
    ,
    setTick,
  ] =
    useState(0);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setTick(
            (
              current,
            ) =>
              current +
              1,
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  /* ==========================================================
   * ROUND STATE
   * ======================================================== */

  const reasonOf = (
    round:
      PublicRound,
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
    round:
      PublicRound,
  ) =>
    availabilityBadge(
      reasonOf(
        round,
      ),
    );

  const setSelected = (
    round:
      | PublicRound
      | null,
  ) => {
    setSelectedId(
      round?.id ??
        null,
    );
  };

  const selected =
    rounds.find(
      (
        round,
      ) =>
        round.id ===
        selectedId,
    ) ?? null;

  const openRounds =
    rounds.filter(
      (
        round,
      ) =>
        stateOf(
          round,
        ) ===
        "open",
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
      {/* ======================================================
       * HERO
       * ==================================================== */}

      <header className="mb-10 text-center">
        <h1 className="text-solar text-4xl font-normal sm:text-6xl">
          Solaris Song
          Contest
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Confirm your
          participation and
          submit your entry. It
          only takes a couple
          of minutes.
        </p>
      </header>

      {/* ======================================================
       * NO ROUNDS
       * ==================================================== */}

      {rounds.length ===
      0 ? (
        <div className="surface p-8 text-center">
          <h2 className="text-lg">
            No submission
            rounds are
            available
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Confirmations are
            currently closed.
            Please check back
            later.
          </p>
        </div>
      ) : null}

      {/* ======================================================
       * ROUND CHOOSER
       * ==================================================== */}

      {!active &&
      rounds.length >
        0 ? (
        <div className="space-y-3">
          {rounds.map(
            (
              round,
            ) => {
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
                    <div className="min-w-0">
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
                      opensAt={
                        round.opens_at
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
                      maximum
                      number of
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

                  {state ===
                    "scheduled" &&
                  round.opens_at ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      This round
                      will open
                      automatically
                      at its
                      scheduled
                      time.
                    </p>
                  ) : null}
                </button>
              );
            },
          )}
        </div>
      ) : null}

      {/* ======================================================
       * ACTIVE ROUND
       * ==================================================== */}

      {active ? (
        <div className="space-y-6">
          <div className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
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
                opensAt={
                  active.opens_at
                }
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
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {
                  active.response_count
                }{" "}
                responses
                received
              </p>
            )}

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
                Choose a
                different round
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

      {/* ======================================================
       * FOOTER
       * ==================================================== */}

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
