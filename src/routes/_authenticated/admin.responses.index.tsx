import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Search,
} from "lucide-react";

import {
  useEditions,
  useScope,
  useSubmissions,
} from "@/lib/adminHooks";

import {
  songSubmitted,
  statusOf,
} from "@/lib/adminModel";

import { ScopePicker } from "@/components/admin/ScopePicker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/admin/responses/",
)({
  component: ResponsesPage,
});

const FILTERS = [
  "All",
  "Participating",
  "Not participating",
  "Internal",
  "National Final",
  "Song submitted",
  "Song missing",
  "Unreviewed",
] as const;

function ResponsesPage() {
  const {
    data: editions,
  } = useEditions();

  const scope =
    useScope(editions);

  const {
    data: submissions,
    isLoading,
  } = useSubmissions({
    ...(scope.editionId
      ? {
          edition_id:
            scope.editionId,
        }
      : {}),

    ...(scope.roundId
      ? {
          round_id:
            scope.roundId,
        }
      : {}),
  });

  const [
    filter,
    setFilter,
  ] = useState<
    (typeof FILTERS)[number]
  >("All");

  const [
    q,
    setQ,
  ] =
    useState("");

  const rows =
    useMemo(() => {
      let list =
        submissions ?? [];

      if (
        filter ===
        "Participating"
      ) {
        list =
          list.filter(
            (s) =>
              s.participating,
          );
      }

      if (
        filter ===
        "Not participating"
      ) {
        list =
          list.filter(
            (s) =>
              !s.participating,
          );
      }

      if (
        filter ===
        "Internal"
      ) {
        list =
          list.filter(
            (s) =>
              s.selection_method ===
              "internal",
          );
      }

      if (
        filter ===
        "National Final"
      ) {
        list =
          list.filter(
            (s) =>
              s.selection_method ===
              "national_final",
          );
      }

      if (
        filter ===
        "Song submitted"
      ) {
        list =
          list.filter(
            songSubmitted,
          );
      }

      if (
        filter ===
        "Song missing"
      ) {
        list =
          list.filter(
            (s) =>
              s.participating &&
              !songSubmitted(
                s,
              ),
          );
      }

      if (
        filter ===
        "Unreviewed"
      ) {
        list =
          list.filter(
            (s) =>
              !s.reviewed,
          );
      }

      const term =
        q
          .trim()
          .toLowerCase();

      if (term) {
        list =
          list.filter(
            (s) =>
              s.country
                .toLowerCase()
                .includes(
                  term,
                ) ||
              s.instagram_username
                .toLowerCase()
                .includes(
                  term,
                ) ||
              (
                s
                  .internal_entries
                  ?.song_title ??
                ""
              )
                .toLowerCase()
                .includes(
                  term,
                ) ||
              (
                s
                  .internal_entries
                  ?.artist ??
                ""
              )
                .toLowerCase()
                .includes(
                  term,
                ),
          );
      }

      return list;
    }, [
      submissions,
      filter,
      q,
    ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl sm:text-4xl">
          Responses
        </h1>

        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Combined view of every confirmation in the selected scope.
        </p>
      </header>

      <ScopePicker
        scope={scope}
        editions={
          editions
        }
      />

      <div className="space-y-3">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2">
            {FILTERS.map(
              (item) => (
                <button
                  key={
                    item
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      item,
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors",

                    filter ===
                      item
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-white/12 bg-white/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            className="h-11 pl-9"
            placeholder="Search country, user or song"
            value={q}
            onChange={(
              e,
            ) =>
              setQ(
                e.target
                  .value,
              )
            }
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {isLoading
          ? "Loading responses…"
          : `${rows.length} ${
              rows.length ===
              1
                ? "response"
                : "responses"
            }`}
      </p>

      {/* MOBILE */}

      <div className="space-y-3 sm:hidden">
        {rows.map(
          (s) => {
            const entry =
              s
                .internal_entries
                ?.song_title
                ? `${s.internal_entries.artist} — ${s.internal_entries.song_title}`
                : s
                      .national_finals
                      ?.nf_name
                  ? `${s.national_finals.nf_name} (${s.national_finals.national_final_entries.length})`
                  : "Not submitted";

            const method =
              s.participating
                ? (
                    s.selection_method ??
                    "unknown"
                  ).replace(
                    "_",
                    " ",
                  )
                : "Not participating";

            const status =
              statusOf(
                s,
              );

            return (
              <Link
                key={
                  s.id
                }
                to="/admin/responses/$id"
                params={{
                  id:
                    s.id,
                }}
                className="surface block p-5 transition-transform active:scale-[0.985]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl">
                        {
                          s.country
                        }
                      </h2>

                      {!s.reviewed ? (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-accent">
                          New
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      @
                      {
                        s.instagram_username
                      }
                    </p>
                  </div>

                  <ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Method
                    </p>

                    <p className="mt-1 text-sm capitalize">
                      {
                        method
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Status
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 text-sm">
                      {songSubmitted(
                        s,
                      ) ? (
                        <CheckCircle2 className="size-3.5 text-success" />
                      ) : (
                        <CircleAlert className="size-3.5 text-muted-foreground" />
                      )}

                      <span>
                        {
                          status
                        }
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Entry
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm">
                      {
                        entry
                      }
                    </p>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />

                    <span>
                      Submitted{" "}
                      {new Date(
                        s.submitted_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          },
        )}

        {rows.length ===
        0 ? (
          <div className="surface p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : "No responses match this view."}
            </p>
          </div>
        ) : null}
      </div>

      {/* DESKTOP */}

      <div className="surface hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">
                  Country
                </th>

                <th className="px-4 py-3">
                  Instagram
                </th>

                <th className="px-4 py-3">
                  Method
                </th>

                <th className="px-4 py-3">
                  Entry
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3">
                  Submitted
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (s) => (
                  <tr
                    key={
                      s.id
                    }
                    className="border-b border-border/60 last:border-0 hover:bg-accent/5"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to="/admin/responses/$id"
                        params={{
                          id:
                            s.id,
                        }}
                        className="hover:text-accent"
                      >
                        {
                          s.country
                        }
                      </Link>

                      {!s.reviewed ? (
                        <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase text-accent">
                          new
                        </span>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      @
                      {
                        s.instagram_username
                      }
                    </td>

                    <td className="px-4 py-3 capitalize">
                      {s.participating
                        ? (
                            s.selection_method ??
                            "unknown"
                          ).replace(
                            "_",
                            " ",
                          )
                        : "Not participating"}
                    </td>

                    <td className="px-4 py-3">
                      {s
                        .internal_entries
                        ?.song_title
                        ? `${s.internal_entries.artist} — ${s.internal_entries.song_title}`
                        : s
                              .national_finals
                              ?.nf_name
                          ? `${s.national_finals.nf_name} (${s.national_finals.national_final_entries.length})`
                          : "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {
                        statusOf(
                          s,
                        )
                      }
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(
                        s.submitted_at,
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ),
              )}

              {rows.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {isLoading
                      ? "Loading…"
                      : "No responses match this view."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
