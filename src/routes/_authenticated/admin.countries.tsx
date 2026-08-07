import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { useEditions, useScope, useSubmissions } from "@/lib/adminHooks";
import { songSubmitted, statusOf } from "@/lib/adminModel";
import { ScopePicker } from "@/components/admin/ScopePicker";

export const Route = createFileRoute("/_authenticated/admin/countries")({
  component: CountriesPage,
});

function CountriesPage() {
  const { data: editions } = useEditions();
  const scope = useScope(editions);
  const { data: submissions } = useSubmissions(
    scope.editionId ? { edition_id: scope.editionId } : {},
  );

  const countries = useMemo(() => {
    const map = new Map<string, typeof submissions extends undefined ? never : any[]>();
    for (const s of submissions ?? []) {
      const list = map.get(s.country) ?? [];
      list.push(s);
      map.set(s.country, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [submissions]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Countries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each delegation and everything they submitted in this edition.
        </p>
      </header>

      <ScopePicker scope={scope} editions={editions} showRounds={false} />

      <div className="grid gap-3 md:grid-cols-2">
        {countries.map(([country, rows]) => {
          const latest = rows[0];
          return (
            <div key={country} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{country}</h2>
                  <p className="text-xs text-muted-foreground">@{latest.instagram_username}</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {statusOf(latest)}
                </span>
              </div>
              <ul className="mt-4 space-y-1.5">
                {rows.map((s: any) => (
                  <li key={s.id}>
                    <Link
                      to="/admin/responses/$id"
                      params={{ id: s.id }}
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm transition-colors hover:border-accent/60"
                    >
                      <span>{s.submission_rounds?.name ?? "Round"}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.participating
                          ? songSubmitted(s)
                            ? "Song submitted"
                            : "Awaiting song"
                          : "Not participating"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {countries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses in this edition yet.</p>
        ) : null}
      </div>
    </div>
  );
}
