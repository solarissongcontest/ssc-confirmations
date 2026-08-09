import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useQueryClient,
} from "@tanstack/react-query";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  useState,
} from "react";

import {
  toast,
} from "sonner";

import {
  ExternalLink,
  ListPlus,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  deleteRound,
  saveRound,
  setRoundStatus,
} from "@/lib/admin.functions";

import {
  useEditions,
  useScope,
  useSubmissions,
} from "@/lib/adminHooks";

import {
  ScopePicker,
} from "@/components/admin/ScopePicker";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  cn,
} from "@/lib/utils";

export const Route =
  createFileRoute(
    "/_authenticated/admin/rounds",
  )({
    component:
      RoundsPage,
  });

const STATUSES = [
  "draft",
  "open",
  "closed",
  "auto_closed",
] as const;

type Status =
  (typeof STATUSES)[number];

const EMPTY = {
  name: "",

  status:
    "draft" as Status,

  opens_at: "",

  closes_at: "",

  response_limit: "",
};

function RoundsPage() {
  const {
    data:
      editions,
  } =
    useEditions();

  const scope =
    useScope(
      editions,
    );

  const qc =
    useQueryClient();

  const save =
    useServerFn(
      saveRound,
    );

  const setStatus =
    useServerFn(
      setRoundStatus,
    );

  const remove =
    useServerFn(
      deleteRound,
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
    form,
    setForm,
  ] =
    useState<
      typeof EMPTY & {
        id?: string;
      }
    >(EMPTY);

  const [
    error,
    setError,
  ] =
    useState("");

  function refresh() {
    void qc.invalidateQueries({
      queryKey: [
        "editions",
      ],
    });

    void qc.invalidateQueries({
      queryKey: [
        "submissions",
      ],
    });
  }

  async function submit() {
    if (
      !scope.editionId
    ) {
      setError(
        "Create an edition first.",
      );

      return;
    }

    if (
      !form.name.trim()
    ) {
      setError(
        "Round name is required.",
      );

      return;
    }

    if (
      form.response_limit &&
      !/^\d+$/.test(
        form.response_limit,
      )
    ) {
      setError(
        "Response limit must be a number.",
      );

      return;
    }

    setError(
      "",
    );

    await save({
      data: {
        ...(form.id
          ? {
              id:
                form.id,
            }
          : {}),

        edition_id:
          scope.editionId,

        name:
          form.name.trim(),

        status:
          form.status,

        opens_at:
          form.opens_at
            ? new Date(
                form.opens_at,
              ).toISOString()
            : null,

        closes_at:
          form.closes_at
            ? new Date(
                form.closes_at,
              ).toISOString()
            : null,

        response_limit:
          form.response_limit
            ? Number(
                form.response_limit,
              )
            : null,
      },
    });

    toast.success(
      form.id
        ? "Round updated"
        : "Round created",
    );

    setForm(
      EMPTY,
    );

    refresh();
  }

  const toLocal = (
    iso:
      | string
      | null,
  ) =>
    iso
      ? new Date(
          iso,
        )
          .toISOString()
          .slice(
            0,
            16,
          )
      : "";

  return (
    <div className="space-y-6">
      {/* ======================================================
       * HEADER
       * ==================================================== */}

      <header>
        <h1 className="text-2xl font-semibold">
          Submission rounds
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Open, close and
          limit each round.
          Rounds close
          automatically when
          the limit is
          reached.
        </p>
      </header>

      {/* ======================================================
       * EDITION
       * ==================================================== */}

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

      {/* ======================================================
       * NEXT IN LINE
       * ==================================================== */}

      <section className="surface overflow-hidden">
        <div className="border-b border-border/60 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
              <ListPlus className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-accent">
                Next in Line
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Next in Line
                submissions
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Separate form
                for delegations
                that could take
                an available
                place in the
                selected
                edition.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {scope.edition ? (
            <>
              <div className="rounded-xl border border-border/70 bg-secondary/25 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Current
                  edition
                </p>

                <p className="mt-1 font-medium">
                  {
                    scope.edition
                      .name
                  }
                </p>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                The Next in
                Line form uses
                the countries
                and National
                Final entries
                already
                submitted for
                this edition.
                It is separate
                from the normal
                confirmation
                round limits.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                >
                  <a
                    href="/next-in-line"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-4" />

                    Open Next in
                    Line form
                  </a>
                </Button>

                <Button
                  variant="outline"
                  asChild
                >
                  <a
                    href="/next-in-line"
                  >
                    View form
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create or
              select an
              edition before
              using Next in
              Line.
            </p>
          )}
        </div>
      </section>

      {/* ======================================================
       * CREATE / EDIT ROUND
       * ==================================================== */}

      <div className="surface space-y-4 p-5">
        <h2 className="text-sm font-semibold">
          {form.id
            ? "Edit round"
            : "New round"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              Round name
            </Label>

            <Input
              value={
                form.name
              }
              placeholder="Confirmations Round 1"
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  name:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Response limit
              (optional)
            </Label>

            <Input
              value={
                form.response_limit
              }
              placeholder="45"
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  response_limit:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Opens at
              (optional)
            </Label>

            <Input
              type="datetime-local"
              value={
                form.opens_at
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  opens_at:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Closes at
              (optional)
            </Label>

            <Input
              type="datetime-local"
              value={
                form.closes_at
              }
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  closes_at:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>
        </div>

        {/* STATUS */}

        <div className="flex flex-wrap gap-2">
          {STATUSES.map(
            (
              status,
            ) => (
              <button
                key={
                  status
                }
                type="button"
                onClick={() =>
                  setForm({
                    ...form,

                    status,
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",

                  form.status ===
                    status
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {status.replace(
                  "_",
                  " ",
                )}
              </button>
            ),
          )}
        </div>

        {error ? (
          <p className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            onClick={() =>
              void submit()
            }
          >
            {form.id
              ? "Save changes"
              : "Create round"}
          </Button>

          {form.id ? (
            <Button
              variant="ghost"
              onClick={() =>
                setForm(
                  EMPTY,
                )
              }
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {/* ======================================================
       * EXISTING ROUNDS
       * ==================================================== */}

      <div className="space-y-3">
        {scope.rounds.map(
          (
            round,
          ) => {
            const count =
              (
                submissions ??
                []
              ).filter(
                (
                  submission,
                ) =>
                  submission.round_id ===
                  round.id,
              ).length;

            return (
              <div
                key={
                  round.id
                }
                className="surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {
                        round.name
                      }
                    </h3>

                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {round.status.replace(
                        "_",
                        " ",
                      )}
                      {" · "}
                      {
                        count
                      }

                      {round.response_limit
                        ? ` / ${round.response_limit}`
                        : ""}{" "}
                      responses
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {round.opens_at
                        ? `Opens ${new Date(
                            round.opens_at,
                          ).toLocaleString()}`
                        : "No open date"}

                      {" · "}

                      {round.closes_at
                        ? `Closes ${new Date(
                            round.closes_at,
                          ).toLocaleString()}`
                        : "No close date"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        "open",
                        "closed",
                        "draft",
                      ] as Status[]
                    ).map(
                      (
                        status,
                      ) => (
                        <Button
                          key={
                            status
                          }
                          size="sm"
                          variant={
                            round.status ===
                            status
                              ? "default"
                              : "outline"
                          }
                          onClick={async () => {
                            await setStatus({
                              data: {
                                id:
                                  round.id,

                                status,
                              },
                            });

                            refresh();

                            toast.success(
                              `Round ${status}`,
                            );
                          }}
                        >
                          {status ===
                          "open"
                            ? "Open"
                            : status ===
                                "closed"
                              ? "Close"
                              : "Draft"}
                        </Button>
                      ),
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          id:
                            round.id,

                          name:
                            round.name,

                          status:
                            round.status as Status,

                          opens_at:
                            toLocal(
                              round.opens_at,
                            ),

                          closes_at:
                            toLocal(
                              round.closes_at,
                            ),

                          response_limit:
                            round.response_limit
                              ? String(
                                  round.response_limit,
                                )
                              : "",
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (
                          !confirm(
                            `Delete ${round.name} and all its responses?`,
                          )
                        ) {
                          return;
                        }

                        await remove({
                          data: {
                            id:
                              round.id,
                          },
                        });

                        refresh();

                        toast.success(
                          "Round deleted",
                        );
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          },
        )}

        {scope.rounds.length ===
        0 ? (
          <p className="text-sm text-muted-foreground">
            No rounds in
            this edition
            yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
