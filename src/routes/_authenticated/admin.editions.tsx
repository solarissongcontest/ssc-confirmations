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
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  deleteEdition,
  saveEdition,
} from "@/lib/admin.functions";

import {
  setEditionEditing,
} from "@/lib/editing.functions";

import {
  useEditions,
  type AdminEdition,
} from "@/lib/adminHooks";

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
  Textarea,
} from "@/components/ui/textarea";

import {
  cn,
} from "@/lib/utils";

export const Route =
  createFileRoute(
    "/_authenticated/admin/editions",
  )({
    component:
      EditionsPage,
  });

const STATUSES = [
  "draft",
  "active",
  "finished",
] as const;

function EditionsPage() {
  const {
    data:
      editions,
  } =
    useEditions();

  const qc =
    useQueryClient();

  const save =
    useServerFn(
      saveEdition,
    );

  const remove =
    useServerFn(
      deleteEdition,
    );

  const setEditing =
    useServerFn(
      setEditionEditing,
    );

  const [
    form,
    setForm,
  ] =
    useState<{
      id?: string;

      name: string;

      edition_number:
        string;

      description:
        string;

      status:
        (typeof STATUSES)[number];
    }>({
      name: "",

      edition_number:
        "",

      description:
        "",

      status:
        "draft",
    });

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
  }

  async function submit() {
    if (
      !form.name.trim()
    ) {
      setError(
        "Edition name is required.",
      );

      return;
    }

    if (
      !/^\d+$/.test(
        form.edition_number,
      )
    ) {
      setError(
        "Edition number must be a number.",
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

        name:
          form.name.trim(),

        edition_number:
          Number(
            form.edition_number,
          ),

        description:
          form.description.trim(),

        status:
          form.status,
      },
    });

    toast.success(
      form.id
        ? "Edition updated"
        : "Edition created",
    );

    setForm({
      name: "",

      edition_number:
        "",

      description:
        "",

      status:
        "draft",
    });

    refresh();
  }

  function edit(
    edition:
      AdminEdition,
  ) {
    setForm({
      id:
        edition.id,

      name:
        edition.name,

      edition_number:
        String(
          edition.edition_number,
        ),

      description:
        edition.description ??
        "",

      status:
        edition.status as
          (typeof STATUSES)[number],
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Editions
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Every contest
          edition and the
          rounds inside it.
        </p>
      </header>

      {/* CREATE / EDIT */}

      <div className="surface space-y-4 p-5">
        <h2 className="text-sm font-semibold">
          {form.id
            ? "Edit edition"
            : "New edition"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              Edition name
            </Label>

            <Input
              value={
                form.name
              }
              placeholder="SSC 22"
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  name:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Edition number
            </Label>

            <Input
              value={
                form.edition_number
              }
              placeholder="22"
              onChange={(
                event,
              ) =>
                setForm({
                  ...form,

                  edition_number:
                    event.target
                      .value,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Description
            (optional)
          </Label>

          <Textarea
            value={
              form.description
            }
            onChange={(
              event,
            ) =>
              setForm({
                ...form,

                description:
                  event.target
                    .value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>
            Status
          </Label>

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
                  {
                    status
                  }
                </button>
              ),
            )}
          </div>
        </div>

        {error ? (
          <p className="text-xs font-medium text-destructive">
            {
              error
            }
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            onClick={() =>
              void submit()
            }
          >
            <Plus className="size-4" />

            {form.id
              ? "Save changes"
              : "Create edition"}
          </Button>

          {form.id ? (
            <Button
              variant="ghost"
              onClick={() =>
                setForm({
                  name:
                    "",

                  edition_number:
                    "",

                  description:
                    "",

                  status:
                    "draft",
                })
              }
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {/* EDITIONS */}

      <div className="space-y-3">
        {(editions ??
          []).map(
          (
            edition,
          ) => (
            <div
              key={
                edition.id
              }
              className="surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {
                      edition.name
                    }
                  </h3>

                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    #
                    {
                      edition.edition_number
                    }{" "}
                    ·{" "}
                    {
                      edition.status
                    }
                  </p>

                  {edition.description ? (
                    <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                      {
                        edition.description
                      }
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      edit(
                        edition,
                      )
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
                          `Delete ${edition.name} and all its rounds and responses?`,
                        )
                      ) {
                        return;
                      }

                      await remove({
                        data: {
                          id:
                            edition.id,
                        },
                      });

                      refresh();

                      toast.success(
                        "Edition deleted",
                      );
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* EDITING CONTROL */}

              <div className="mt-4 rounded-xl border border-border bg-secondary/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      Submission
                      editing
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Applies to
                      every round
                      in this
                      edition.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={
                        edition.editing_enabled
                          ? "default"
                          : "outline"
                      }
                      onClick={async () => {
                        await setEditing({
                          data: {
                            edition_id:
                              edition.id,

                            enabled:
                              true,
                          },
                        });

                        refresh();

                        toast.success(
                          "Edition editing opened",
                        );
                      }}
                    >
                      Open
                    </Button>

                    <Button
                      size="sm"
                      variant={
                        !edition.editing_enabled
                          ? "default"
                          : "outline"
                      }
                      onClick={async () => {
                        await setEditing({
                          data: {
                            edition_id:
                              edition.id,

                            enabled:
                              false,
                          },
                        });

                        refresh();

                        toast.success(
                          "Edition editing closed",
                        );
                      }}
                    >
                      Closed
                    </Button>
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5">
                {edition.submission_rounds.map(
                  (
                    round,
                  ) => (
                    <li
                      key={
                        round.id
                      }
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                    >
                      <span>
                        {
                          round.name
                        }
                      </span>

                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        {round.status.replace(
                          "_",
                          " ",
                        )}
                      </span>
                    </li>
                  ),
                )}

                {edition.submission_rounds.length ===
                0 ? (
                  <li className="text-xs text-muted-foreground">
                    No rounds yet.
                  </li>
                ) : null}
              </ul>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
