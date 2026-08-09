import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  toast,
} from "sonner";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Shield,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";

import {
  createEditLink,
  deleteSubmission,
  getSubmission,
  getSubmissionTechnical,
  revokeEditLink,
  updateSubmissionFlags,
} from "@/lib/admin.functions";

import {
  getReviewHistory,
  reviewInternalEntry,
  reviewNationalFinalEntry,
  setWinningEntryWithReason,
} from "@/lib/review.functions";

import {
  describeDate,
  statusOf,
  winningNfEntry,
  type AdminSubmission,
  type EntryReviewStatus,
} from "@/lib/adminModel";

import {
  Button,
} from "@/components/ui/button";

import {
  Label,
} from "@/components/ui/label";

import {
  Switch,
} from "@/components/ui/switch";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  cn,
} from "@/lib/utils";

export const Route =
  createFileRoute(
    "/_authenticated/admin/responses/$id",
  )({
    component:
      ResponseDetail,
  });

function Row({
  label,
  value,
}: {
  label:
    string;

  value:
    ReactNode;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span className="text-right font-medium">
        {value}
      </span>
    </div>
  );
}

function ReviewBadge({
  status,
}: {
  status:
    EntryReviewStatus;
}) {
  const bad =
    status ===
      "declined" ||
    status ===
      "removed";

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",

        status ===
          "accepted"
          ? "bg-success/15 text-success"
          : bad
            ? "bg-destructive/15 text-destructive"
            : "bg-warning/15 text-warning",
      )}
    >
      {status}
    </span>
  );
}

function ResponseDetail() {
  const {
    id,
  } =
    Route.useParams();

  const navigate =
    useNavigate();

  const qc =
    useQueryClient();

  const get =
    useServerFn(
      getSubmission,
    );

  const updateFlags =
    useServerFn(
      updateSubmissionFlags,
    );

  const remove =
    useServerFn(
      deleteSubmission,
    );

  const getTechnical =
    useServerFn(
      getSubmissionTechnical,
    );

  const generateEditLink =
    useServerFn(
      createEditLink,
    );

  const revokeLink =
    useServerFn(
      revokeEditLink,
    );

  const reviewInternal =
    useServerFn(
      reviewInternalEntry,
    );

  const reviewNf =
    useServerFn(
      reviewNationalFinalEntry,
    );

  const setWinner =
    useServerFn(
      setWinningEntryWithReason,
    );

  const getHistory =
    useServerFn(
      getReviewHistory,
    );

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    internalReason,
    setInternalReason,
  ] =
    useState("");

  const [
    nfReasons,
    setNfReasons,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    generatedLink,
    setGeneratedLink,
  ] =
    useState<
      string | null
    >(null);

  const [
    linkType,
    setLinkType,
  ] =
    useState<
      "reusable"
      | "one_time"
    >(
      "reusable",
    );

  const {
    data,
  } =
    useQuery({
      queryKey: [
        "submission",
        id,
      ],

      queryFn:
        () =>
          get({
            data: {
              id,
            },
          }),
    });

  const {
    data:
      technical,
  } =
    useQuery({
      queryKey: [
        "submission-technical",
        id,
      ],

      queryFn:
        () =>
          getTechnical({
            data: {
              id,
            },
          }),
    });

  const {
    data:
      moderationHistory,
  } =
    useQuery({
      queryKey: [
        "submission-review-history",
        id,
      ],

      queryFn:
        () =>
          getHistory({
            data: {
              submission_id:
                id,
            },
          }),
    });

  const submission =
    data?.submission as
      | AdminSubmission
      | null
      | undefined;

  useEffect(() => {
    if (
      submission
    ) {
      setNotes(
        submission.admin_notes ??
          "",
      );
    }
  }, [
    submission?.admin_notes,
    submission?.id,
  ]);

  if (
    !submission
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading response…
      </p>
    );
  }

  const internal =
    submission.internal_entries;

  const nf =
    submission.national_finals;

  const winner =
    winningNfEntry(
      submission,
    );

  function refresh() {
    void qc.invalidateQueries({
      queryKey: [
        "submission",
        id,
      ],
    });

    void qc.invalidateQueries({
      queryKey: [
        "submissions",
      ],
    });

    void qc.invalidateQueries({
      queryKey: [
        "submission-review-history",
        id,
      ],
    });
  }

  async function flags(
    patch:
      Record<
        string,
        boolean | string
      >,
  ) {
    await updateFlags({
      data: {
        id,
        ...patch,
      },
    });

    refresh();
  }

  async function reviewInternal(
    status:
      | "pending"
      | "accepted"
      | "declined",
  ) {
    if (
      !internal
    ) {
      return;
    }

    const reason =
      internalReason.trim();

    if (
      !reason
    ) {
      toast.error(
        "A reason is required.",
      );

      return;
    }

    await reviewInternal({
      data: {
        entry_id:
          internal.id,

        status,

        reason,
      },
    });

    setInternalReason(
      "",
    );

    refresh();
  }

  async function reviewNfEntry(
    entryId:
      string,

    status:
      | "pending"
      | "accepted"
      | "declined"
      | "removed",
  ) {
    const reason =
      (
        nfReasons[
          entryId
        ] ??
        ""
      ).trim();

    if (
      !reason
    ) {
      toast.error(
        "A reason is required.",
      );

      return;
    }

    await reviewNf({
      data: {
        entry_id:
          entryId,

        status,

        reason,
      },
    });

    setNfReasons(
      (
        current,
      ) => ({
        ...current,

        [entryId]:
          "",
      }),
    );

    refresh();
  }

  async function changeWinner(
    entryId:
      string,
  ) {
    if (
      !nf
    ) {
      return;
    }

    const reason =
      (
        nfReasons[
          entryId
        ] ??
        ""
      ).trim();

    if (
      !reason
    ) {
      toast.error(
        "A reason is required.",
      );

      return;
    }

    const clearing =
      nf.winning_entry_id ===
      entryId;

    await setWinner({
      data: {
        national_final_id:
          nf.id,

        entry_id:
          clearing
            ? null
            : entryId,

        reason,
      },
    });

    setNfReasons(
      (
        current,
      ) => ({
        ...current,

        [entryId]:
          "",
      }),
    );

    refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/responses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />

        Back to responses
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">
          {
            submission.country
          }
        </h1>

        <p className="text-sm text-muted-foreground">
          @
          {
            submission.instagram_username
          }
          {" · "}
          {
            statusOf(
              submission,
            )
          }
        </p>
      </header>

      {/* ======================================================
       * DELEGATION
       * ==================================================== */}

      <section className="surface p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Delegation
        </h2>

        <Row
          label="Country"
          value={
            submission.country
          }
        />

        <Row
          label="Selection method"
          value={
            submission.selection_method ===
            "national_final"
              ? "National Final"
              : submission.selection_method ===
                  "internal"
                ? "Internal Selection"
                : "Unknown"
          }
        />
      </section>

      {/* ======================================================
       * INTERNAL
       * ==================================================== */}

      {internal ? (
        <section className="surface space-y-4 p-5">
          <div className="flex justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Internal entry
            </h2>

            <ReviewBadge
              status={
                internal.review_status
              }
            />
          </div>

          <Row
            label="Artist"
            value={
              internal.artist ??
              "—"
            }
          />

          <Row
            label="Song"
            value={
              internal.song_title ??
              "—"
            }
          />

          <Row
            label="25s preview"
            value={
              internal.preview_start
                ? `${internal.preview_start} – ${internal.preview_end}`
                : "—"
            }
          />

          <Row
            label="90s final clip"
            value={
              internal.final_clip_start
                ? `${internal.final_clip_start} – ${internal.final_clip_end}`
                : "—"
            }
          />

          <Textarea
            placeholder="Required public reason"
            value={
              internalReason
            }
            onChange={(
              event,
            ) =>
              setInternalReason(
                event.target
                  .value,
              )
            }
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                void reviewInternal(
                  "accepted",
                )
              }
            >
              <CheckCircle2 className="size-4" />

              Accept
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                void reviewInternal(
                  "declined",
                )
              }
            >
              <XCircle className="size-4" />

              Decline
            </Button>
          </div>
        </section>
      ) : null}

      {/* ======================================================
       * NATIONAL FINAL
       * ==================================================== */}

      {nf ? (
        <section className="surface space-y-5 p-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              National Final
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              {
                nf.nf_name ??
                "Unnamed National Final"
              }
            </h2>
          </div>

          {winner ? (
            <div className="rounded-xl border-2 border-accent/50 bg-accent/10 p-5">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-accent" />

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                    NF Winner
                  </p>

                  <p className="font-semibold">
                    {
                      winner.artist
                    }
                    {" — "}
                    {
                      winner.song_title
                    }
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Row
                  label="Song link"
                  value={
                    winner.song_url ? (
                      <a
                        href={
                          winner.song_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline"
                      >
                        Open
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />

                <Row
                  label="25s preview"
                  value={
                    winner.preview_start
                      ? `${winner.preview_start} – ${winner.preview_end}`
                      : "Not submitted"
                  }
                />

                <Row
                  label="90s final clip"
                  value={
                    winner.final_clip_start
                      ? `${winner.final_clip_start} – ${winner.final_clip_end}`
                      : "Not submitted"
                  }
                />

                <Row
                  label="Replacement video"
                  value={
                    winner.replacement_video_required
                      ? winner.replacement_video_url ??
                        "Required, URL missing"
                      : "Not needed"
                  }
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                This entry is
                stored as the
                National Final
                winner. It is not
                an internal
                selection.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
              National Final
              winner not known
              yet.
            </div>
          )}

          <div className="space-y-3">
            {nf.national_final_entries.map(
              (
                entry,
              ) => (
                <div
                  key={
                    entry.id
                  }
                  className={cn(
                    "rounded-xl border p-4",

                    entry.removed
                      ? "border-destructive/50 bg-destructive/10"
                      : nf.winning_entry_id ===
                          entry.id
                        ? "border-accent/50 bg-accent/10"
                        : "border-border bg-secondary/20",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p
                        className={cn(
                          "font-medium",

                          entry.removed
                            ? "line-through"
                            : "",
                        )}
                      >
                        {
                          entry.artist
                        }
                        {" — "}
                        {
                          entry.song_title
                        }
                      </p>

                      {entry.song_url ? (
                        <a
                          href={
                            entry.song_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent underline"
                        >
                          Open song
                        </a>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <ReviewBadge
                        status={
                          entry.removed
                            ? "removed"
                            : entry.review_status
                        }
                      />

                      {nf.winning_entry_id ===
                      entry.id ? (
                        <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-semibold uppercase text-accent">
                          Winner
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {entry.review_reason ? (
                    <p className="mt-3 text-sm">
                      {
                        entry.review_reason
                      }
                    </p>
                  ) : null}

                  <Textarea
                    className="mt-4"
                    placeholder="Required public reason"
                    value={
                      nfReasons[
                        entry.id
                      ] ??
                      ""
                    }
                    onChange={(
                      event,
                    ) =>
                      setNfReasons(
                        (
                          current,
                        ) => ({
                          ...current,

                          [entry.id]:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        void reviewNfEntry(
                          entry.id,
                          "accepted",
                        )
                      }
                    >
                      Accept
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        void reviewNfEntry(
                          entry.id,
                          "declined",
                        )
                      }
                    >
                      Decline
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        void reviewNfEntry(
                          entry.id,
                          "removed",
                        )
                      }
                    >
                      Remove
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        entry.removed
                      }
                      onClick={() =>
                        void changeWinner(
                          entry.id,
                        )
                      }
                    >
                      <Trophy className="size-4" />

                      {nf.winning_entry_id ===
                      entry.id
                        ? "Clear winner"
                        : "Mark winner"}
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* ======================================================
       * ADMIN CONTROLS
       * ==================================================== */}

      <section className="surface space-y-4 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Admin controls
        </h2>

        <div className="flex items-center justify-between">
          <Label>
            Allow participant
            to edit
          </Label>

          <Switch
            checked={
              submission.editing_allowed
            }
            onCheckedChange={(
              value,
            ) =>
              void flags({
                editing_allowed:
                  value,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>
            Locked
          </Label>

          <Switch
            checked={
              submission.locked
            }
            onCheckedChange={(
              value,
            ) =>
              void flags({
                locked:
                  value,
              })
            }
          />
        </div>

        <Label>
          Internal admin notes
        </Label>

        <Textarea
          value={
            notes
          }
          onChange={(
            event,
          ) =>
            setNotes(
              event.target
                .value,
            )
          }
        />

        <Button
          size="sm"
          onClick={async () => {
            await flags({
              admin_notes:
                notes,
            });

            toast.success(
              "Notes saved",
            );
          }}
        >
          Save notes
        </Button>
      </section>

      {/* ======================================================
       * EDIT LINK
       * ==================================================== */}

      <section className="surface space-y-4 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Edit access
        </h2>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={
              linkType ===
              "reusable"
                ? "default"
                : "outline"
            }
            onClick={() =>
              setLinkType(
                "reusable",
              )
            }
          >
            Reusable
          </Button>

          <Button
            size="sm"
            variant={
              linkType ===
              "one_time"
                ? "default"
                : "outline"
            }
            onClick={() =>
              setLinkType(
                "one_time",
              )
            }
          >
            One-time
          </Button>
        </div>

        <Button
          onClick={async () => {
            const result =
              await generateEditLink({
                data: {
                  submission_id:
                    id,

                  token_type:
                    linkType,

                  expires_in_hours:
                    null,
                },
              });

            const url =
              `${window.location.origin}/edit/${result.token}`;

            setGeneratedLink(
              url,
            );

            await navigator.clipboard.writeText(
              url,
            );

            toast.success(
              "Edit link copied",
            );
          }}
        >
          <Link2 className="size-4" />

          Generate edit link
        </Button>

        {generatedLink ? (
          <div className="rounded-lg border border-border p-3">
            <p className="break-all text-xs">
              {
                generatedLink
              }
            </p>

            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void navigator.clipboard.writeText(
                    generatedLink,
                  )
                }
              >
                <Copy className="size-4" />

                Copy
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  window.open(
                    generatedLink,
                    "_blank",
                  )
                }
              >
                <ExternalLink className="size-4" />

                Open
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {/* ======================================================
       * MODERATION HISTORY
       * ==================================================== */}

      <section className="surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Moderation history
        </h2>

        <div className="mt-4 space-y-2">
          {(
            moderationHistory ??
            []
          ).map(
            (
              item:
                any,
            ) => (
              <div
                key={
                  item.id
                }
                className="rounded-lg border border-border p-3"
              >
                <p className="font-medium">
                  {
                    item.artist_snapshot
                  }
                  {" — "}
                  {
                    item.song_title_snapshot
                  }
                </p>

                <p className="mt-1 text-xs uppercase text-muted-foreground">
                  {
                    item.action
                  }
                </p>

                <p className="mt-2 text-sm">
                  {
                    item.reason
                  }
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* ======================================================
       * TECHNICAL INFO
       * ==================================================== */}

      <section className="surface p-5">
        <div className="flex items-center gap-2">
          <Shield className="size-4" />

          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Technical
            information
          </h2>
        </div>

        <Row
          label="Known IPs"
          value={
            technical
              ?.ip_history
              ?.length ??
            0
          }
        />
      </section>

      <Button
        variant="destructive"
        onClick={async () => {
          if (
            !confirm(
              "Delete this response permanently?",
            )
          ) {
            return;
          }

          await remove({
            data: {
              id,
            },
          });

          navigate({
            to:
              "/admin/responses",
          });
        }}
      >
        <Trash2 className="size-4" />

        Delete response
      </Button>
    </div>
  );
}
