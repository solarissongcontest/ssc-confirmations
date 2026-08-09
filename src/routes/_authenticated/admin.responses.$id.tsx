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
  updateSubmissionFlags,
} from "@/lib/admin.functions";

import {
  getReviewHistory,
  reviewInternalEntry,
  reviewNationalFinalEntry,
  setWinningEntryWithReason,
} from "@/lib/review.functions";

import {
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
  const negative =
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
          : negative
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

  const reviewInternalAction =
    useServerFn(
      reviewInternalEntry,
    );

  const reviewNfAction =
    useServerFn(
      reviewNationalFinalEntry,
    );

  const setWinnerAction =
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
    >(
      null,
    );

  const [
    linkType,
    setLinkType,
  ] =
    useState<
      "reusable" |
      "one_time"
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
        boolean |
        string
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

  /* =========================================================
   * INTERNAL REVIEW
   * Accept = NO REASON.
   * ======================================================= */

  async function handleInternalReview(
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
      status !==
        "accepted" &&
      !reason
    ) {
      toast.error(
        "A reason is required for this action.",
      );

      return;
    }

    try {
      await reviewInternalAction({
        data: {
          entry_id:
            internal.id,

          status,

          reason:
            status ===
            "accepted"
              ? ""
              : reason,
        },
      });

      setInternalReason(
        "",
      );

      refresh();

      toast.success(
        status ===
          "accepted"
          ? "Entry accepted"
          : status ===
              "declined"
            ? "Entry declined"
            : "Entry reset to pending",
      );
    } catch (
      error
    ) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Could not update the entry review.",
      );
    }
  }

  /* =========================================================
   * NF REVIEW
   * Accept = NO REASON.
   * ======================================================= */

  async function handleNfReview(
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
      status !==
        "accepted" &&
      !reason
    ) {
      toast.error(
        "A reason is required for this action.",
      );

      return;
    }

    try {
      await reviewNfAction({
        data: {
          entry_id:
            entryId,

          status,

          reason:
            status ===
            "accepted"
              ? ""
              : reason,
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

      toast.success(
        status ===
          "removed"
          ? "NF entry removed"
          : status ===
              "accepted"
            ? "Entry accepted"
            : status ===
                "declined"
              ? "Entry declined"
              : "Entry reset to pending",
      );
    } catch (
      error
    ) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Could not update the NF entry.",
      );
    }
  }

  async function handleWinnerChange(
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
        "A reason is required to change the winner.",
      );

      return;
    }

    const clearing =
      nf.winning_entry_id ===
      entryId;

    try {
      await setWinnerAction({
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

      toast.success(
        clearing
          ? "Winner cleared"
          : "NF winner updated",
      );
    } catch (
      error
    ) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Could not update the NF winner.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/responses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
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

        <p className="mt-1 text-sm text-muted-foreground">
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

      {/* DELEGATION */}

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
          label="Instagram"
          value={`@${submission.instagram_username}`}
        />

        <Row
          label="Country account"
          value={
            submission.has_country_account
              ? submission.country_account ??
                "Yes"
              : "No"
          }
        />

        <Row
          label="Participating"
          value={
            submission.participating
              ? "Yes"
              : "No"
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

        <Row
          label="Submitted"
          value={
            new Date(
              submission.submitted_at,
            ).toLocaleString()
          }
        />

        <Row
          label="Last updated"
          value={
            new Date(
              submission.updated_at,
            ).toLocaleString()
          }
        />
      </section>

      {/* INTERNAL */}

      {internal ? (
        <section
          className={cn(
            "surface space-y-4 p-5",

            internal.review_status ===
              "accepted"
              ? "border border-success/35"
              : internal.review_status ===
                  "declined"
                ? "border border-destructive/50"
                : "",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Internal selection
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {
                  internal.artist ??
                  "Unknown artist"
                }
                {" — "}
                {
                  internal.song_title ??
                  "Unknown song"
                }
              </h2>
            </div>

            <ReviewBadge
              status={
                internal.review_status ??
                "pending"
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
            label="Song link"
            value={
              internal.song_url ? (
                <a
                  href={
                    internal.song_url
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
              internal.preview_start
                ? `${internal.preview_start} – ${internal.preview_end ?? "—"}`
                : "Not submitted"
            }
          />

          <Row
            label="90s final clip"
            value={
              internal.final_clip_start
                ? `${internal.final_clip_start} – ${internal.final_clip_end ?? "—"}`
                : "Not submitted"
            }
          />

          <Row
            label="Replacement video"
            value={
              internal.replacement_video_required
                ? internal.replacement_video_url ? (
                    <a
                      href={
                        internal.replacement_video_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline"
                    >
                      Open replacement video
                    </a>
                  ) : (
                    "Required, URL missing"
                  )
                : "Not needed"
            }
          />

          {internal.review_reason ? (
            <div
              className={cn(
                "rounded-xl border p-4",

                internal.review_status ===
                  "declined"
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-border bg-secondary/20",
              )}
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Public reason
              </p>

              <p className="mt-2 text-sm">
                {
                  internal.review_reason
                }
              </p>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-border/60 pt-4">
            <div>
              <Label>
                Reason
              </Label>

              <p className="mt-1 text-xs text-muted-foreground">
                Optional for
                acceptance. Required
                for decline or
                reset.
              </p>
            </div>

            <Textarea
              value={
                internalReason
              }
              placeholder="No reason needed to accept."
              onChange={(
                event,
              ) =>
                setInternalReason(
                  event.target
                    .value,
                )
              }
            />

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  void handleInternalReview(
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
                  void handleInternalReview(
                    "declined",
                  )
                }
              >
                <XCircle className="size-4" />

                Decline
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void handleInternalReview(
                    "pending",
                  )
                }
              >
                Reset pending
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* NATIONAL FINAL */}

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

            <p className="mt-1 text-sm text-muted-foreground">
              {
                nf.national_final_entries.filter(
                  (
                    entry,
                  ) =>
                    !entry.removed,
                ).length
              }{" "}
              active entries
            </p>
          </div>

          {winner ? (
            <div className="rounded-xl border-2 border-accent/50 bg-accent/10 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Trophy className="size-5" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                    National Final winner
                  </p>

                  <h3 className="mt-1 text-lg font-semibold">
                    {
                      winner.artist ??
                      "Unknown artist"
                    }
                    {" — "}
                    {
                      winner.song_title ??
                      "Unknown song"
                    }
                  </h3>
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
                        Open song
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
                      ? `${winner.preview_start} – ${winner.preview_end ?? "—"}`
                      : "Not submitted"
                  }
                />

                <Row
                  label="90s final clip"
                  value={
                    winner.final_clip_start
                      ? `${winner.final_clip_start} – ${winner.final_clip_end ?? "—"}`
                      : "Not submitted"
                  }
                />

                <Row
                  label="Replacement video"
                  value={
                    winner.replacement_video_required
                      ? winner.replacement_video_url ? (
                          <a
                            href={
                              winner.replacement_video_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline"
                          >
                            Open replacement video
                          </a>
                        ) : (
                          "Required, URL missing"
                        )
                      : "Not needed"
                  }
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm font-medium">
                National Final
                winner not known yet
              </p>
            </div>
          )}

          <div className="space-y-3">
            {nf.national_final_entries.map(
              (
                entry,
              ) => {
                const isWinner =
                  nf.winning_entry_id ===
                  entry.id;

                const reviewStatus:
                  EntryReviewStatus =
                  entry.removed
                    ? "removed"
                    : entry.review_status ??
                      "pending";

                return (
                  <div
                    key={
                      entry.id
                    }
                    className={cn(
                      "rounded-xl border p-4",

                      entry.removed ||
                      reviewStatus ===
                        "declined"
                        ? "border-destructive/50 bg-destructive/10"
                        : isWinner
                          ? "border-accent/50 bg-accent/10"
                          : reviewStatus ===
                              "accepted"
                            ? "border-success/30 bg-success/5"
                            : "border-border bg-secondary/20",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p
                          className={cn(
                            "font-medium",

                            entry.removed
                              ? "line-through opacity-70"
                              : "",
                          )}
                        >
                          {
                            entry.artist ??
                            "Unknown artist"
                          }
                          {" — "}
                          {
                            entry.song_title ??
                            "Unknown song"
                          }
                        </p>

                        {entry.song_url ? (
                          <a
                            href={
                              entry.song_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-accent underline"
                          >
                            Open song
                          </a>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <ReviewBadge
                          status={
                            reviewStatus
                          }
                        />

                        {isWinner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-accent">
                            <Trophy className="size-3" />

                            Winner
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isWinner ? (
                      <div className="mt-4 rounded-lg border border-accent/25 bg-background/20 p-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
                          Winner technical details
                        </p>

                        <Row
                          label="25s preview"
                          value={
                            entry.preview_start
                              ? `${entry.preview_start} – ${entry.preview_end ?? "—"}`
                              : "Not submitted"
                          }
                        />

                        <Row
                          label="90s final clip"
                          value={
                            entry.final_clip_start
                              ? `${entry.final_clip_start} – ${entry.final_clip_end ?? "—"}`
                              : "Not submitted"
                          }
                        />

                        <Row
                          label="Replacement video"
                          value={
                            entry.replacement_video_required
                              ? entry.replacement_video_url ??
                                "Required, URL missing"
                              : "Not needed"
                          }
                        />
                      </div>
                    ) : null}

                    {entry.review_reason ? (
                      <div
                        className={cn(
                          "mt-3 rounded-lg border p-3",

                          reviewStatus ===
                              "declined" ||
                            reviewStatus ===
                              "removed"
                            ? "border-destructive/40 bg-destructive/10"
                            : "border-border bg-background/20",
                        )}
                      >
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Public reason
                        </p>

                        <p className="mt-1 text-sm">
                          {
                            entry.review_reason
                          }
                        </p>
                      </div>
                    ) : null}

                    {entry.removed ? (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-destructive">
                        Removed from the
                        participant&apos;s
                        National Final
                      </p>
                    ) : null}

                    <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                      <div>
                        <Label>
                          Reason
                        </Label>

                        <p className="mt-1 text-xs text-muted-foreground">
                          No reason is
                          required to
                          accept this
                          song. Decline,
                          remove, reset
                          and winner
                          changes still
                          require one.
                        </p>
                      </div>

                      <Textarea
                        value={
                          nfReasons[
                            entry.id
                          ] ??
                          ""
                        }
                        placeholder="No reason needed to accept."
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

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            void handleNfReview(
                              entry.id,
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
                            void handleNfReview(
                              entry.id,
                              "declined",
                            )
                          }
                        >
                          <XCircle className="size-4" />

                          Decline
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void handleNfReview(
                              entry.id,
                              "removed",
                            )
                          }
                        >
                          Remove from NF
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleNfReview(
                              entry.id,
                              "pending",
                            )
                          }
                        >
                          Reset pending
                        </Button>

                        <Button
                          size="sm"
                          variant={
                            isWinner
                              ? "default"
                              : "outline"
                          }
                          disabled={
                            entry.removed
                          }
                          onClick={() =>
                            void handleWinnerChange(
                              entry.id,
                            )
                          }
                        >
                          <Trophy className="size-4" />

                          {isWinner
                            ? "Clear winner"
                            : "Mark winner"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            {nf.national_final_entries.length ===
            0 ? (
              <p className="text-sm text-muted-foreground">
                No National Final
                entries submitted yet.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ADMIN CONTROLS */}

      <section className="surface space-y-5 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Admin controls
        </h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="allow-editing">
              Allow participant
              to edit
            </Label>

            <p className="mt-1 text-xs text-muted-foreground">
              Individual response
              editing permission.
            </p>
          </div>

          <Switch
            id="allow-editing"
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

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="locked">
              Lock response
            </Label>

            <p className="mt-1 text-xs text-muted-foreground">
              A locked response
              cannot be edited.
            </p>
          </div>

          <Switch
            id="locked"
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

        <div className="space-y-2 border-t border-border/60 pt-4">
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
            placeholder="Only admins can see these notes."
          />

          <Button
            size="sm"
            onClick={async () => {
              try {
                await flags({
                  admin_notes:
                    notes,
                });

                toast.success(
                  "Notes saved",
                );
              } catch (
                error
              ) {
                toast.error(
                  error instanceof
                    Error
                    ? error.message
                    : "Could not save notes.",
                );
              }
            }}
          >
            Save notes
          </Button>
        </div>
      </section>

      {/* EDIT ACCESS */}

      <section className="surface space-y-4 p-5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Edit access
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Generate a private
            participant edit link.
          </p>
        </div>

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
            try {
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
                "Edit link generated and copied",
              );
            } catch (
              error
            ) {
              toast.error(
                error instanceof
                  Error
                  ? error.message
                  : "Could not create edit link.",
              );
            }
          }}
        >
          <Link2 className="size-4" />

          Generate edit link
        </Button>

        {generatedLink ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="break-all text-xs text-muted-foreground">
              {
                generatedLink
              }
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    generatedLink,
                  );

                  toast.success(
                    "Copied",
                  );
                }}
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
                    "noopener,noreferrer",
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

      {/* MODERATION HISTORY */}

      <section className="surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Moderation history
        </h2>

        <div className="mt-4 space-y-3">
          {(
            moderationHistory ??
            []
          ).map(
            (
              item: {
                id:
                  string;

                artist_snapshot?:
                  string |
                  null;

                song_title_snapshot?:
                  string |
                  null;

                action:
                  string;

                reason?:
                  string |
                  null;

                created_at:
                  string;
              },
            ) => (
              <div
                key={
                  item.id
                }
                className="rounded-lg border border-border bg-secondary/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {item.artist_snapshot
                      ? `${item.artist_snapshot} — ${item.song_title_snapshot ?? ""}`
                      : "Entry"}
                  </p>

                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {item.action.replace(
                      "_",
                      " ",
                    )}
                  </span>
                </div>

                {item.reason &&
                item.reason !==
                  "Accepted" ? (
                  <p className="mt-2 text-sm">
                    {
                      item.reason
                    }
                  </p>
                ) : null}

                <p className="mt-2 text-[10px] text-muted-foreground">
                  {new Date(
                    item.created_at,
                  ).toLocaleString()}
                </p>
              </div>
            ),
          )}

          {(
            moderationHistory ??
            []
          ).length ===
          0 ? (
            <p className="text-sm text-muted-foreground">
              No moderation
              actions yet.
            </p>
          ) : null}
        </div>
      </section>

      {/* TECHNICAL INFORMATION */}

      <section className="surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" />

          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Technical information
          </h2>
        </div>

        <Row
          label="Known IP addresses"
          value={
            technical
              ?.ip_history
              ?.length ??
            0
          }
        />

        <Row
          label="Edits made"
          value={
            submission.edit_count
          }
        />
      </section>

      {/* DELETE */}

      <section className="surface border border-destructive/25 p-5">
        <h2 className="text-sm font-semibold text-destructive">
          Delete response
        </h2>

        <p className="mt-1 text-xs text-muted-foreground">
          This permanently
          deletes the
          confirmation and
          its related data.
        </p>

        <Button
          className="mt-4"
          variant="destructive"
          onClick={async () => {
            if (
              !confirm(
                `Delete the response from ${submission.country} permanently?`,
              )
            ) {
              return;
            }

            try {
              await remove({
                data: {
                  id,
                },
              });

              toast.success(
                "Response deleted",
              );

              navigate({
                to:
                  "/admin/responses",
              });
            } catch (
              error
            ) {
              toast.error(
                error instanceof
                  Error
                  ? error.message
                  : "Could not delete the response.",
              );
            }
          }}
        >
          <Trash2 className="size-4" />

          Delete response
        </Button>
      </section>
    </div>
  );
}
