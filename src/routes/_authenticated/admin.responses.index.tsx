import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useEditions, useScope, useSubmissions } from "@/lib/adminHooks";
import { songSubmitted, statusOf } from "@/lib/adminModel";
import { ScopePicker } from "@/components/admin/ScopePicker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/responses/")({
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
  const { data: editions } = useEditions();
  const scope = useScope(editions);
  const { data: submissions, isLoading } = useSubmissions({
    ...(scope.editionId ? { edition_id: scope.editionId } : {}),
    ...(scope.roundId ? { round_id: scope.roundId } : {}),
  });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    let list = submissions ?? [];
    if (filter === "Participating") list = list.filter((s) => s.participating);
    if (filter === "Not participating") list = list.filter((s) => !s.participating);
    if (filter === "Internal") list = list.filter((s) => s.selection_method === "internal");
    if (filter === "National Final")
      list = list.filter((s) => s.selection_method === "national_final");
    if (filter === "Song submitted") list = list.filter(songSubmitted);
    if (filter === "Song missing")
      list = list.filter((s) => s.participating && !songSubmitted(s));
    if (filter === "Unreviewed") list = list.filter((s) => !s.reviewed);
    const term = q.trim().toLowerCase();
    if (term)
      list = list.filter(
        (s) =>
          s.country.toLowerCase().includes(term) ||
          s.instagram_username.toLowerCase().includes(term) ||
          (s.internal_entries?.song_title ?? "").toLowerCase().includes(term) ||
          (s.internal_entries?.artist ?? "").toLowerCase().includes(term),
      );
    return list;
  }, [submissions, filter, q]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Responses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Combined view of every confirmation in the selected scope.
        </p>
      </header>

      <ScopePicker scope={scope} editions={editions} />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              filter === f
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search country, user, song"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Instagram</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-accent/5">
                <td className="px-4 py-3 font-medium">
                  <Link
                    to="/admin/responses/$id"
                    params={{ id: s.id }}
                    className="hover:text-accent"
                  >
                    {s.country}
                  </Link>
                  {!s.reviewed ? (
                    <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase text-accent">
                      new
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">@{s.instagram_username}</td>
                <td className="px-4 py-3 capitalize">
                  {s.participating
                    ? (s.selection_method ?? "unknown").replace("_", " ")
                    : "Not participating"}
                </td>
                <td className="px-4 py-3">
                  {s.internal_entries?.song_title
                    ? `${s.internal_entries.artist} — ${s.internal_entries.song_title}`
                    : s.national_finals?.nf_name
                      ? `${s.national_finals.nf_name} (${s.national_finals.national_final_entries.length})`
                      : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{statusOf(s)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(s.submitted_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : "No responses match this view."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
