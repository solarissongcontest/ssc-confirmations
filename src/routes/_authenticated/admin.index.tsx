import { createFileRoute } from "@tanstack/react-router";

import { useEditions, useScope, useSubmissions } from "@/lib/adminHooks";
import { songSubmitted, statusOf } from "@/lib/adminModel";
import { Progress } from "@/components/ui/progress";
import { ScopePicker } from "@/components/admin/ScopePicker";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: StatsPage,
});

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatsPage() {
  const { data: editions } = useEditions();
  const scope = useScope(editions);
  const { data: submissions } = useSubmissions({
    ...(scope.editionId ? { edition_id: scope.editionId } : {}),
    ...(scope.roundId ? { round_id: scope.roundId } : {}),
  });

  const rows = submissions ?? [];
  const participating = rows.filter((r) => r.participating);
  const internal = participating.filter((r) => r.selection_method === "internal");
  const nf = participating.filter((r) => r.selection_method === "national_final");
  const unknown = participating.filter(
    (r) => !r.selection_method || r.selection_method === "unknown",
  );
  const songs = participating.filter(songSubmitted);
  const limit = scope.round?.response_limit ?? null;

  const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const s = statusOf(r);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live overview of confirmations for the selected round.
        </p>
      </header>

      <ScopePicker scope={scope} editions={editions} />

      {limit ? (
        <div className="surface p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Responses</span>
            <span>
              {rows.length} / {limit}
            </span>
          </div>
          <Progress value={(rows.length / limit) * 100} className="mt-3 h-2" />
          {rows.length >= limit ? (
            <p className="mt-2 text-xs font-semibold text-warning">FULL / CLOSED</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Responses" value={limit ? `${rows.length} / ${limit}` : String(rows.length)} />
        <Card label="Participating" value={String(participating.length)} />
        <Card label="Not participating" value={String(rows.length - participating.length)} />
        <Card label="Internal" value={String(internal.length)} />
        <Card label="National Finals" value={String(nf.length)} />
        <Card label="Unknown selection" value={String(unknown.length)} />
        <Card label="Songs submitted" value={String(songs.length)} />
        <Card label="Songs missing" value={String(participating.length - songs.length)} />
      </div>

      <div className="surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Entry statuses
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <li
              key={status}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
            >
              <span>{status}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
          {Object.keys(statusCounts).length === 0 ? (
            <li className="text-sm text-muted-foreground">No responses yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
