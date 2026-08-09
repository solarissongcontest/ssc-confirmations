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
  Lock,
  Pencil,
} from "lucide-react";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  findMySubmission,
  getPublicRounds,
  type PublicRound,
} from "@/lib/public.functions";

import {
  ConfirmationForm,
} from "@/components/ConfirmationForm";

import {
  SubmissionReviewStatus,
} from "@/components/SubmissionReviewStatus";

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
  getBrowserSessionId,
} from "@/lib/session";

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
      ],
    }),

    loader:
      () =>
        getPublicRounds(),

    component:
      Index,
  });

type MySubmission = {
  found:
    boolean;

  can_edit?:
    boolean;

  submission?:
    any;
};

function formatCountdown(
  opensAt:
    | string
    | null,
) {
  if (!opensAt) {
    return "OPENS SOON";
  }

  const difference =
    new Date(
      opensAt,
    ).getTime() -
    Date.now();

  if (
    difference <=
    0
  ) {
    return "OPEN";
  }

  const seconds =
    Math.floor(
      difference /
        1000,
    );

  const days =
    Math.floor(
      seconds /
        86400,
    );

  const hours =
    Math.floor(
      (
        seconds %
        86400
      ) /
        3600,
    );

  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) /
        60,
    );

  const remaining =
    seconds %
    60;

  if (
    days >
    0
  ) {
    return `OPENS IN ${days}D ${hours}H ${minutes}M`;
  }

  if (
    hours >
    0
  ) {
    return `OPENS IN ${hours}H ${minutes}M`;
  }

  if (
    minutes >
    0
  ) {
    return `OPENS IN ${minutes}M ${remaining}S`;
  }

  return `OPENS IN ${remaining}S`;
}

function StateBadge({
  state,
  opensAt,
}: {
  state:
    string;

  opensAt?:
    | string
    | null;
}) {
  const label =
    state ===
    "open"
      ? "OPEN"
      : state ===
          "full"
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

        state ===
          "open"
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

  const findMine =
    useServerFn(
      findMySubmission,
    );

  const sessionId =
    useMemo(
      () =>
        getBrowserSessionId(),
      [],
    );

  const [
    rounds,
    setRounds,
  ] =
    useState<
      PublicRound[]
    >(
      initial,
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    mine,
    setMine,
  ] =
    useState<
      Record<
        string,
        MySubmission
      >
    >({});

  const [
    tick,
    setTick,
  ] =
    useState(0);

  useEffect(() => {
    if (
      !sessionId ||
      rounds.length ===
        0
    ) {
      return;
    }

    let cancelled =
      false;

    void (async () => {
      const entries =
        await Promise.all(
          rounds.map(
            async (
              round,
            ) => {
              try {
                const result =
                  await findMine({
                    data: {
                      round_id:
                        round.id,

                      browser_session_id:
                        sessionId,
                    },
                  });

                return [
                  round.id,
                  result as MySubmission,
                ] as const;
              } catch {
                return [
                  round.id,
                  {
                    found:
                      false,
                  },
                ] as const;
              }
            },
          ),
        );

      if (
        !cancelled
      ) {
        setMine(
          Object.fromEntries(
            entries,
          ),
        );
      }
    })();

    return () => {
      cancelled =
        true;
    };
  }, [
    rounds,
    sessionId,
    findMine,
  ]);

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "public-rounds",
        )

        .on(
          "postgres_changes",
          {
            event:
              "*",

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
                round_id?:
                  string;

                submitted_count?:
                  number;
              };

            if (
              !row.round_id
            ) {
              return;
            }

            setRounds(
              (
                current,
              ) =>
                current.map(
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
            event:
              "*",

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
                id?:
                  string;
              };

            if (
              !row.id
            ) {
              return;
            }

            setRounds(
              (
                current,
              ) =>
                current.map(
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

  useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setTick(
            (
              value,
            ) =>
              value +
              1,
          ),
        1000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, []);

  const reasonOf = (
    round:
      PublicRound,
  ) => {
    void tick;

    return computeAvailability({
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
  };

  const stateOf = (
    round:
      PublicRound,
  ) =>
    availabilityBadge(
      reasonOf(
        round,
      ),
    );

  const selected =
    rounds.find(
      (
        round,
      ) =>
        round.id ===
        selectedId,
    ) ??
    null;

  const active =
    selected ??
    (
      rounds.length ===
        1 &&
      stateOf(
        rounds[0]!,
      ) ===
        "open"
        ? rounds[0]!
        : null
    );

  const activeMine =
    active
      ? mine[
          active.id
        ]
      : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-solar text-4xl font-normal sm:text-6xl">
          Solaris Song
          Contest
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Confirm your
          participation or
          return to edit an
          existing response.
        </p>
      </header>

      {!active ? (
        <div className="space-y-3">
          {rounds.map(
            (
              round,
            ) => {
              const state =
                stateOf(
                  round,
                );

              const mineForRound =
                mine[
                  round.id
                ];

              const hasMine =
                Boolean(
                  mineForRound
                    ?.found,
                );

              const selectable =
                state ===
                  "open" ||
                hasMine;

              return (
                <button
                  key={
                    round.id
                  }
                  type="button"
                  disabled={
                    !selectable
                  }
                  onClick={() =>
                    setSelectedId(
                      round.id,
                    )
                  }
                  className={cn(
                    "surface block w-full p-5 text-left transition-all",

                    selectable
                      ? "cursor-pointer hover:-translate-y-0.5"
                      : "cursor-default opacity-65",
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
                      opensAt={
                        round.opens_at
                      }
                    />
                  </div>

                  {round.response_limit ? (
                    <div className="mt-4">
                      <Progress
                        value={
                          (
                            round.response_count /
                            round.response_limit
                          ) *
                          100
                        }
                        className="h-1.5"
                      />

                      <p className="mt-2 text-xs text-muted-foreground">
                        {
                          round.response_count
                        }
                        {" / "}
                        {
                          round.response_limit
                        }{" "}
                        spots filled
                      </p>
                    </div>
                  ) : null}

                  {hasMine ? (
                    <div className="mt-4 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Pencil className="size-4 text-accent" />

                        <p className="text-sm font-medium">
                          Your response
                          is already
                          submitted
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {mineForRound
                          ?.can_edit
                          ? "Tap to view the organiser review and edit your response."
                          : "Tap to view the organiser review. Editing is currently closed."}
                      </p>
                    </div>
                  ) : state ===
                    "open" ? (
                    <p className="mt-3 text-xs font-medium text-accent">
                      Tap to submit.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      New
                      submissions
                      are currently
                      closed.
                    </p>
                  )}
                </button>
              );
            },
          )}
        </div>
      ) : null}

      {active ? (
        <div className="space-y-6">
          <div className="surface p-5">
            <div className="flex items-start justify-between gap-3">
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
                state={
                  stateOf(
                    active,
                  )
                }
                opensAt={
                  active.opens_at
                }
              />
            </div>

            {rounds.length >
            1 ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 -ml-2"
                onClick={() =>
                  setSelectedId(
                    null,
                  )
                }
              >
                Choose a
                different
                round
              </Button>
            ) : null}
          </div>

          {activeMine?.found ? (
            <>
              <SubmissionReviewStatus
                mode="browser"
                roundId={
                  active.id
                }
                browserSessionId={
                  sessionId
                }
              />

              {activeMine.can_edit &&
              activeMine.submission ? (
                <>
                  <div className="surface border border-accent/25 p-4">
                    <p className="text-sm font-medium">
                      Editing your
                      existing
                      response
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      If you change
                      your submitted
                      entry, it will
                      need to be
                      checked by the
                      organisers
                      again.
                    </p>
                  </div>

                  <ConfirmationForm
                    round={
                      active
                    }
                    prefill={
                      activeMine.submission
                    }
                    editToken="__browser_session_edit__"
                  />
                </>
              ) : (
                <div className="surface p-8 text-center">
                  <Lock className="mx-auto size-7 text-muted-foreground" />

                  <h2 className="mt-4 text-xl font-semibold">
                    Editing is
                    closed
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Your response
                    and organiser
                    review remain
                    visible, but
                    you cannot
                    change the
                    submission
                    right now.
                  </p>
                </div>
              )}
            </>
          ) : (
            <ConfirmationForm
              round={
                active
              }
              availability={
                reasonOf(
                  active,
                )
              }
            />
          )}
        </div>
      ) : null}

      <div className="mt-8 text-center">
        <Button
          variant="outline"
          asChild
        >
          <Link to="/next-in-line">
            Next in Line
          </Link>
        </Button>
      </div>

      <footer className="mt-12 text-center">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Lock className="size-3" />

          Organiser access
        </Link>
      </footer>
    </main>
  );
}
