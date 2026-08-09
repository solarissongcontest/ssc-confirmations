import {
  useQuery,
} from "@tanstack/react-query";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  History,
  XCircle,
} from "lucide-react";

import {
  getMyReviewStatus,
  getTokenReviewStatus,
  type PublicReviewEntry,
  type PublicReviewPayload,
} from "@/lib/review.public.functions";

import {
  cn,
} from "@/lib/utils";

type Props =
  | {
      mode:
        "browser";

      roundId:
        string;

      browserSessionId:
        string;
    }
  | {
      mode:
        "token";

      token:
        string;
    };

function StatusBadge({
  status,
}: {
  status:
    string;
}) {
  const accepted =
    status ===
    "accepted";

  const bad =
    status ===
      "declined" ||
    status ===
      "removed";

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",

        accepted
          ? "bg-success/15 text-success"
          : bad
            ? "bg-destructive/15 text-destructive"
            : "bg-warning/15 text-warning",
      )}
    >
      {status ===
      "removed"
        ? "Removed"
        : status}
    </span>
  );
}

function EntryRow({
  entry,
}: {
  entry:
    PublicReviewEntry;
}) {
  const bad =
    entry.review_status ===
      "declined" ||
    entry.review_status ===
      "removed" ||
    entry.removed;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",

        entry.review_status ===
          "accepted"
          ? "border-success/35 bg-success/10"
          : bad
            ? "border-destructive/50 bg-destructive/10"
            : "border-warning/30 bg-warning/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "font-medium",

              entry.removed
                ? "line-through opacity-70"
                : "",
            )}
          >
            {entry.artist ??
              "Unknown artist"}
            {" — "}
            {entry.song_title ??
              "Unknown song"}
          </p>
        </div>

        <StatusBadge
          status={
            entry.removed
              ? "removed"
              : entry.review_status
          }
        />
      </div>

      {entry.review_reason ? (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Organiser reason
          </p>

          <p
            className={cn(
              "mt-1 text-sm leading-relaxed",

              bad
                ? "font-medium text-destructive"
                : "",
            )}
          >
            {
              entry.review_reason
            }
          </p>
        </div>
      ) : entry.review_status ===
        "pending" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          This song has not
          been checked yet.
        </p>
      ) : null}

      {entry.removed ? (
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-destructive">
          This song was
          removed from your
          National Final by
          the organisers.
        </p>
      ) : null}
    </div>
  );
}

export function SubmissionReviewStatus(
  props: Props,
) {
  const getMine =
    useServerFn(
      getMyReviewStatus,
    );

  const getToken =
    useServerFn(
      getTokenReviewStatus,
    );

  const {
    data,
    isLoading,
  } =
    useQuery({
      queryKey:
        props.mode ===
        "browser"
          ? [
              "submission-review",
              "browser",
              props.roundId,
              props.browserSessionId,
            ]
          : [
              "submission-review",
              "token",
              props.token,
            ],

      queryFn:
        () =>
          props.mode ===
          "browser"
            ? getMine({
                data: {
                  round_id:
                    props.roundId,

                  browser_session_id:
                    props.browserSessionId,
                },
              })
            : getToken({
                data: {
                  token:
                    props.token,
                },
              }),

      refetchInterval:
        5_000,

      staleTime:
        0,
    });

  if (
    isLoading
  ) {
    return (
      <div className="surface p-4">
        <p className="text-sm text-muted-foreground">
          Checking organiser
          review…
        </p>
      </div>
    );
  }

  const review =
    data as
      | PublicReviewPayload
      | undefined;

  if (
    !review?.found
  ) {
    return null;
  }

  const status =
    review.overall_status ??
    "pending";

  const accepted =
    status ===
    "accepted";

  const declined =
    status ===
    "declined";

  const Icon =
    accepted
      ? CheckCircle2
      : declined
        ? XCircle
        : Clock3;

  const entries =
    review.nf_entries ??
    [];

  const history =
    review.history ??
    [];

  return (
    <section
      className={cn(
        "surface overflow-hidden border-2",

        accepted
          ? "border-success/60 bg-success/10"
          : declined
            ? "border-destructive bg-destructive/10 ring-2 ring-destructive/20"
            : "border-warning/35",
      )}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full",

              accepted
                ? "bg-success/15 text-success"
                : declined
                  ? "bg-destructive/20 text-destructive"
                  : "bg-warning/15 text-warning",
            )}
          >
            <Icon className="size-6" />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Entry review
            </p>

            <h2
              className={cn(
                "mt-1 text-xl font-semibold uppercase",

                accepted
                  ? "text-success"
                  : declined
                    ? "text-destructive"
                    : "",
              )}
            >
              {accepted
                ? "Entry accepted"
                : declined
                  ? "Entry declined / action required"
                  : "Not checked yet"}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {accepted
                ? "The organisers have checked and accepted your submitted entry."
                : declined
                  ? "One or more submitted songs have been declined or removed. Read the organiser reason below and update your submission if editing is still open."
                  : "Your submission has been received, but the organisers have not finished checking every song yet."}
            </p>
          </div>
        </div>
      </div>

      {review.internal_entry ? (
        <div className="border-t border-border/60 p-5">
          <EntryRow
            entry={
              review.internal_entry
            }
          />
        </div>
      ) : null}

      {entries.length >
      0 ? (
        <div className="space-y-3 border-t border-border/60 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            National Final
            songs
          </h3>

          {entries.map(
            (
              entry,
            ) => (
              <EntryRow
                key={
                  entry.id
                }
                entry={
                  entry
                }
              />
            ),
          )}
        </div>
      ) : null}

      {history.length >
      0 ? (
        <div className="border-t border-border/60 p-5">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />

            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Organiser action
              history
            </h3>
          </div>

          <div className="mt-3 space-y-3">
            {history.map(
              (
                item,
              ) => {
                const bad =
                  item.action ===
                    "declined" ||
                  item.action ===
                    "removed";

                return (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-xl border border-border/70 bg-secondary/20 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {item.artist
                          ? `${item.artist} — ${item.song_title ?? ""}`
                          : "Entry"}
                      </p>

                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-widest",

                          bad
                            ? "text-destructive"
                            : item.action ===
                                "accepted"
                              ? "text-success"
                              : "text-muted-foreground",
                        )}
                      >
                        {item.action.replace(
                          "_",
                          " ",
                        )}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "mt-2 text-sm",

                        bad
                          ? "font-medium text-destructive"
                          : "",
                      )}
                    >
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
                );
              },
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
