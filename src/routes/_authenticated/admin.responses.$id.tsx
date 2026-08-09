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
  type AdminSubmission,
  type EntryReviewStatus,
} from "@/lib/adminModel";

import {
  Button,
} from "@/components/ui/button";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  Switch,
} from "@/components/ui/switch";

import {
  Label,
} from "@/components/ui/label";

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
  label: string;

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
      reviewHistory,
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
    submission?.id,
    submission?.admin_notes,
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
    patch: Record<
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

  async function doInternalReview(
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

    if (!reason) {
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

    toast.success(
      `Entry ${status}`,
    );
  }

  async function doNfReview(
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

    if (!reason) {
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

    toast.success(
      status ===
        "removed"
        ? "NF entry removed"
        : `Entry ${status}`,
    );
  }

  async function changeWinner(
    entryId:
      string,
  ) {
    if (!nf) {
      return;
    }

    const reason =
      (
        nfReasons[
          entryId
        ] ??
        ""
      ).trim();

    if (!reason) {
      toast.error(
        "A reason is required to change the winner.",
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

    toast.success(
      clearing
        ? "Winner cleared"
        : "Winner updated",
    );
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

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
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
        </div>

        <Button
          variant="outline"
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

            toast.success(
              "Response deleted",
            );

            navigate({
              to:
                "/admin/responses",
            });
          }}
        >
          Delete response
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* DELEGATION */}

        <section className="surface p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
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
                : "No account"
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
            value={(
              submission.selection_method ??
              "—"
            ).replace(
              "_",
              " ",
            )}
          />
        </section>

        {/* INTERNAL ENTRY */}

        {internal ? (
          <section
            className={cn(
              "surface space-y-4 p-5",

              internal.review_status ===
                "declined"
                ? "border border-destructive/50"
                : internal.review_status ===
                    "accepted"
                  ? "border border-success/35"
                  : "",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Internal
                selection
              </h2>

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
                "Not known yet"
              }
            />

            <Row
              label="Song"
              value={
                internal.song_title ??
                "Not known yet"
              }
            />

            <Row
              label="Link"
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
                  ? `${internal.preview_start} – ${internal.preview_end}`
                  : "—"
              }
            />

            <Row
              label="90s clip"
              value={
                internal.final_clip_start
                  ? `${internal.final_clip_start} – ${internal.final_clip_end}`
                  : "—"
              }
            />

            {internal.review_reason ? (
              <div
                className={cn(
                  "rounded-xl border p-3",

                  internal.review_status ===
                    "declined"
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-border bg-secondary/20",
                )}
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Current public
                  reason
                </p>

                <p className="mt-1 text-sm">
                  {
                    internal.review_reason
                  }
                </p>
              </div>
            ) : null}

            <div className="space-y-2 border-t border-border/60 pt-4">
              <Label>
                Reason for
                this admin
                action *
              </Label>

              <Textarea
                value={
                  internalReason
                }
                placeholder="This reason will be visible to the participant."
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
                    void doInternalReview(
                      "accepted",
                    )
                  }
                >
                  <CheckCircle2 className="mr-1.5 size-4" />

                  Accept
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    void doInternalReview(
                      "declined",
                    )
                  }
                >
                  <XCircle className="mr-1.5 size-4" />

                  Decline
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void doInternalReview(
                      "pending",
                    )
                  }
                >
                  Reset to
                  pending
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {/* NATIONAL FINAL */}

        {nf ? (
          <section className="surface space-y-4 p-5 lg:col-span-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                National Final
              </h2>

              <p className="mt-1 text-sm">
                {
                  nf.nf_name ??
                  "Unnamed National Final"
                }
              </p>
            </div>

            <Row
              label="Expected entries"
              value={
                nf.expected_entry_count ??
                "Unknown"
              }
            />

            <Row
              label="NF date"
              value={
                describeDate(
                  submission.nf_date_type,
                  submission.nf_exact_date,
                  submission.nf_approximate_text,
                )
              }
            />

            <Row
              label="Result date"
              value={
                describeDate(
                  submission.nf_result_date_type,
                  submission.nf_result_exact_date,
                  submission.nf_result_approximate_text,
                )
              }
            />

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

                      entry.removed ||
                      entry.review_status ===
                        "declined"
                        ? "border-destructive/50 bg-destructive/10"
                        : entry.review_status ===
                            "accepted"
                          ? "border-success/35 bg-success/5"
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
                            className="mt-1 inline-block text-xs text-accent underline"
                          >
                            Open song
                          </a>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <ReviewBadge
                          status={
                            entry.removed
                              ? "removed"
                              : entry.review_status ??
                                "pending"
                          }
                        />

                        {nf.winning_entry_id ===
                        entry.id ? (
                          <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-accent">
                            Winner
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {entry.review_reason ? (
                      <div className="mt-3 rounded-lg border border-border/60 bg-background/20 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Current
                          public
                          reason
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
                        Removed from
                        participant's
                        National Final
                      </p>
                    ) : null}

                    <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                      <Label>
                        Reason for
                        this admin
                        action *
                      </Label>

                      <Textarea
                        value={
                          nfReasons[
                            entry.id
                          ] ??
                          ""
                        }
                        placeholder="Required. The participant will see this reason."
                        onChange={(
                          event,
                        ) =>
                          setNfReasons(
                            (
                              current,
                            ) => ({
                              ...current,

                              [entry.id]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            void doNfReview(
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
                            void doNfReview(
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
                            void doNfReview(
                              entry.id,
                              "removed",
                            )
                          }
                        >
                          Remove from
                          NF
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void doNfReview(
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
                            nf.winning_entry_id ===
                            entry.id
                              ? "default"
                              : "outline"
                          }
                          disabled={
                            entry.removed
                          }
                          onClick={() =>
                            void changeWinner(
                              entry.id,
                            )
                          }
                        >
                          {nf.winning_entry_id ===
                          entry.id
                            ? "Clear winner"
                            : "Mark winner"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
              )}

              {nf.national_final_entries.length ===
              0 ? (
                <p className="text-xs text-muted-foreground">
                  Entries not
                  submitted yet.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* RELEASE */}

        <section className="surface p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Release &amp;
            embargo
          </h2>

          <Row
            label="Reveal date"
            value={
              describeDate(
                submission.reveal_date_type,
                submission.reveal_exact_date,
                submission.reveal_approximate_text,
              )
            }
          />

          <Row
            label="Edits made"
            value={
              submission.edit_count
            }
          />

          <Row
            label="Last update"
            value={
              new Date(
                submission.updated_at,
              ).toLocaleString()
            }
          />
        </section>

        {/* ADMIN CONTROLS */}

        <section className="surface space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Admin controls
          </h2>

          <div className="flex items-center justify-between">
            <Label htmlFor="editing">
              Allow
              participant to
              edit
            </Label>

            <Switch
              id="editing"
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
            <Label htmlFor="locked">
              Locked
            </Label>

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

          <div className="space-y-2">
            <Label htmlFor="notes">
              Internal notes
            </Label>

            <Textarea
              id="notes"
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
          </div>
        </section>

        {/* MODERATION HISTORY */}

        <section className="surface p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Entry moderation
            history
          </h2>

          <div className="mt-4 space-y-2">
            {(
              reviewHistory ??
              []
            ).map(
              (
                item: any,
              ) => (
                <div
                  key={
                    item.id
                  }
                  className="rounded-xl border border-border bg-secondary/20 p-3"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm font-medium">
                      {item.artist_snapshot
                        ? `${item.artist_snapshot} — ${item.song_title_snapshot ?? ""}`
                        : "Entry"}
                    </p>

                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {String(
                        item.action,
                      ).replace(
                        "_",
                        " ",
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-sm">
                    {
                      item.reason
                    }
                  </p>

                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {new Date(
                      item.created_at,
                    ).toLocaleString()}
                  </p>
                </div>
              ),
            )}

            {(
              reviewHistory ??
              []
            ).length ===
            0 ? (
              <p className="text-xs text-muted-foreground">
                No moderation
                actions yet.
              </p>
            ) : null}
          </div>
        </section>

        {/* EDIT ACCESS */}

        <section className="surface space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Edit access
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Generate a
              private edit
              link.
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

                void qc.invalidateQueries({
                  queryKey: [
                    "submission-technical",
                    id,
                  ],
                });
              } catch {
                toast.error(
                  "Could not generate edit link",
                );
              }
            }}
          >
            <Link2 className="mr-2 size-4" />

            Generate edit
            link
          </Button>

          {generatedLink ? (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="break-all text-xs text-muted-foreground">
                {
                  generatedLink
                }
              </p>

              <div className="flex gap-2">
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
                  <Copy className="mr-2 size-3.5" />

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
                  <ExternalLink className="mr-2 size-3.5" />

                  Open
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {(
              technical?.tokens ??
              []
            ).map(
              (
                token,
              ) => (
                <div
                  key={
                    token.id
                  }
                  className="rounded-lg border border-border bg-secondary/20 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {token.token_type ===
                        "one_time"
                          ? "One-time link"
                          : "Reusable link"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {token.active
                          ? "Active"
                          : "Revoked"}
                        {" · Used "}
                        {
                          token.use_count
                        }
                        {" time"}
                        {token.use_count ===
                        1
                          ? ""
                          : "s"}
                      </p>
                    </div>

                    {token.active ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await revokeLink({
                            data: {
                              id:
                                token.id,
                            },
                          });

                          toast.success(
                            "Edit link revoked",
                          );

                          void qc.invalidateQueries({
                            queryKey: [
                              "submission-technical",
                              id,
                            ],
                          });
                        }}
                      >
                        <Trash2 className="mr-2 size-3.5" />

                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        {/* TECHNICAL */}

        <section className="surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />

            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Technical
              information
            </h2>
          </div>

          <Row
            label="Initial IP"
            value={
              technical
                ?.ip_history
                ?.length
                ? technical
                    .ip_history[
                    technical
                      .ip_history
                      .length -
                      1
                  ]
                    ?.ip_address ??
                  "—"
                : "—"
            }
          />

          <Row
            label="Latest IP"
            value={
              technical
                ?.ip_history?.[0]
                ?.ip_address ??
              "—"
            }
          />

          <Row
            label="Known IP addresses"
            value={
              technical
                ?.ip_history
                ?.length ??
              0
            }
          />
        </section>

        {/* EDIT HISTORY */}

        <section className="surface p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Participant edit
            history
          </h2>

          <ul className="space-y-2 text-sm">
            {(
              data?.versions ??
              []
            ).map(
              (
                version: {
                  id:
                    string;

                  version:
                    number;

                  created_at:
                    string;
                },
              ) => (
                <li
                  key={
                    version.id
                  }
                  className="flex justify-between gap-3 text-muted-foreground"
                >
                  <span>
                    Version{" "}
                    {
                      version.version
                    }
                  </span>

                  <span>
                    {new Date(
                      version.created_at,
                    ).toLocaleString()}
                  </span>
                </li>
              ),
            )}

            {(
              data?.versions ??
              []
            ).length ===
            0 ? (
              <li className="text-xs text-muted-foreground">
                No edits
                recorded.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
