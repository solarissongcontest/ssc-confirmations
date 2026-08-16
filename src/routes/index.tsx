import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  KeyRound,
  Lock,
  Pencil,
  RefreshCw,
} from "lucide-react";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  createBrowserEditToken,
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
  RecoveryCodeSetup,
} from "@/components/RecoveryCodeSetup";

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

  submission?: {
    id:
      string;

    country:
      string;

    [key: string]:
      unknown;
  } | null;
};

function formatCountdown(
  opensAt:
    | string
    | null,
) {
  if (
    !opensAt
  ) {
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

  const prepareBrowserEdit =
    useServerFn(
      createBrowserEditToken,
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

  /*
   * Raw edit tokens only live in React memory.
   *
   * The database stores only their hash.
   */
  const [
    browserEditTokens,
    setBrowserEditTokens,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    editAccessErrors,
    setEditAccessErrors,
  ] =
    useState<
      Record<
        string,
        string | null
      >
    >({});

  const [
    editRetry,
    setEditRetry,
  ] =
    useState(
      0,
    );

  /*
   * Stops the 1.5 second submission polling from creating
   * multiple tokens simultaneously.
   */
  const tokenRequests =
    useRef(
      new Set<
        string
      >(),
    );

  const [
    tick,
    setTick,
  ] =
    useState(
      0,
    );

  const refreshMine =
    useCallback(
      async () => {
        if (
          !sessionId ||
          rounds.length ===
            0
        ) {
          return;
        }

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

        setMine(
          Object.fromEntries(
            entries,
          ),
        );
      },
      [
        findMine,
        rounds,
        sessionId,
      ],
    );

  /*
   * Initial check + polling.
   */
  useEffect(() => {
    void refreshMine();

    const timer =
      window.setInterval(
        () => {
          void refreshMine();
        },
        1500,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    refreshMine,
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

            void refreshMine();
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
              payload.new as
                Partial<PublicRound> & {
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
  }, [
    refreshMine,
  ]);

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

  const browserEditToken =
    active
      ? browserEditTokens[
          active.id
        ] ??
        null
      : null;

  const editAccessError =
    active
      ? editAccessErrors[
          active.id
        ] ??
        null
      : null;

  /* ==========================================================
   * PREPARE SAME-BROWSER EDIT ACCESS
   *
   * public_find_my_submission proves that this browser owns the
   * submission.
   *
   * The secure RPC then creates a fresh raw edit token whose
   * hash is stored in the database.
   * ======================================================== */

  useEffect(() => {
    if (
      !active ||
      !sessionId ||
      !activeMine?.found ||
      !activeMine.can_edit ||
      !activeMine.submission
    ) {
      return;
    }

    if (
      browserEditTokens[
        active.id
      ]
    ) {
      return;
    }

    if (
      tokenRequests.current.has(
        active.id,
      )
    ) {
      return;
    }

    const roundId =
      active.id;

    let cancelled =
      false;

    tokenRequests.current.add(
      roundId,
    );

    setEditAccessErrors(
      (
        current,
      ) => ({
        ...current,

        [roundId]:
          null,
      }),
    );

    void (async () => {
      try {
        const result =
          await prepareBrowserEdit({
            data: {
              round_id:
                roundId,

              browser_session_id:
                sessionId,
            },
          });

        if (
          cancelled
        ) {
          return;
        }

        if (
          result.ok &&
          result.token
        ) {
          setBrowserEditTokens(
            (
              current,
            ) => ({
              ...current,

              [roundId]:
                result.token,
            }),
          );

          return;
        }

        const message =
          result.reason ===
            "locked"
            ? "This response is locked."
            : result.reason ===
                "editing_closed"
              ? "Editing is no longer enabled for this response."
              : result.reason ===
                  "not_found"
                ? "This browser could not be linked to the response."
                : "Secure edit access could not be prepared.";

        setEditAccessErrors(
          (
            current,
          ) => ({
            ...current,

            [roundId]:
              message,
          }),
        );
      } catch {
        if (
          cancelled
        ) {
          return;
        }

        setEditAccessErrors(
          (
            current,
          ) => ({
            ...current,

            [roundId]:
              "Secure edit access could not be prepared.",
          }),
        );
      } finally {
        tokenRequests.current.delete(
          roundId,
        );
      }
    })();

    return () => {
      cancelled =
        true;
    };
  }, [
    active?.id,
    activeMine?.can_edit,
    activeMine?.found,
    activeMine?.submission?.id,
    browserEditTokens,
    editRetry,
    prepareBrowserEdit,
    sessionId,
  ]);

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
                          ? "Tap to view the organiser review, recovery code and edit your response."
                          : "Tap to view your recovery code and organiser review. Editing is currently closed."}
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

          {activeMine?.found &&
          activeMine.submission ? (
            <>
              <RecoveryCodeSetup
                submissionId={
                  activeMine
                    .submission
                    .id
                }
                browserSessionId={
                  sessionId
                }
              />

              <SubmissionReviewStatus
                mode="browser"
                roundId={
                  active.id
                }
                browserSessionId={
                  sessionId
                }
              />

              {activeMine.can_edit ? (
                browserEditToken ? (
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
                      editToken={
                        browserEditToken
                      }
                    />
                  </>
                ) : editAccessError ? (
                  <div className="surface p-6 text-center">
                    <p className="text-sm font-medium">
                      Could not prepare
                      secure edit
                      access
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {
                        editAccessError
                      }
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setEditAccessErrors(
                          (
                            current,
                          ) => ({
                            ...current,

                            [active.id]:
                              null,
                          }),
                        );

                        setEditRetry(
                          (
                            current,
                          ) =>
                            current +
                            1,
                        );
                      }}
                    >
                      <RefreshCw className="size-4" />

                      Try again
                    </Button>
                  </div>
                ) : (
                  <div className="surface p-6 text-center text-sm text-muted-foreground">
                    Preparing
                    secure edit
                    access…
                  </div>
                )
              ) : (
                <div className="surface p-8 text-center">
                  <Lock className="mx-auto size-7 text-muted-foreground" />

                  <h2 className="mt-4 text-xl font-semibold">
                    Editing is
                    closed
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Your response,
                    recovery code
                    and organiser
                    review remain
                    available, but
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

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button
          variant="outline"
          asChild
        >
          <Link to="/recover">
            <KeyRound className="size-4" />

            Recover response
          </Link>
        </Button>

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
