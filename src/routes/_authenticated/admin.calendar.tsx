import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { useEditions, useScope, useSubmissions } from "@/lib/adminHooks";
import { ScopePicker } from "@/components/admin/ScopePicker";

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  component: CalendarPage,
});

interface CalendarItem {
  id: string;
  country: string;
  label: string;
  date: string | null;
  approx: string | null;
  kind: string;
}

function CalendarPage() {
  const { data: editions } = useEditions();
  const scope = useScope(editions);
  const { data: submissions } = useSubmissions({
    ...(scope.editionId ? { edition_id: scope.editionId } : {}),
    ...(scope.roundId ? { round_id: scope.roundId } : {}),
  });

  const { dated, undated } = useMemo(() => {
    const items: CalendarItem[] = [];
    for (const s of submissions ?? []) {
      if (!s.participating) continue;
      if (s.reveal_date_type) {
        items.push({
          id: `${s.id}-reveal`,
          country: s.country,
          label:
            s.selection_method === "national_final" ? "Entries reveal" : "Song reveal / release",
          date: s.reveal_date_type === "exact" ? s.reveal_exact_date : null,
          approx:
            s.reveal_date_type === "immediately"
              ? "Immediately"
              : s.reveal_date_type === "approximate"
                ? s.reveal_approximate_text
                : s.reveal_date_type === "unknown"
                  ? "Not known yet"
                  : null,
          kind: "reveal",
        });
      }
      if (s.nf_date_type) {
        items.push({
          id: `${s.id}-nf`,
          country: s.country,
          label: `National Final${s.national_finals?.nf_name ? ` — ${s.national_finals.nf_name}` : ""}`,
          date: s.nf_date_type === "exact" ? s.nf_exact_date : null,
          approx: s.nf_date_type === "approximate" ? s.nf_approximate_text : "Not known yet",
          kind: "nf",
        });
      }
      if (s.nf_result_date_type) {
        items.push({
          id: `${s.id}-nfr`,
          country: s.country,
          label: "National Final result",
          date: s.nf_result_date_type === "exact" ? s.nf_result_exact_date : null,
          approx:
            s.nf_result_date_type === "approximate"
              ? s.nf_result_approximate_text
              : "Not known yet",
          kind: "nf_result",
        });
      }
    }
    return {
      dated: items
        .filter((i) => i.date)
        .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0)),
      undated: items.filter((i) => !i.date),
    };
  }, [submissions]);

  const groups = dated.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    const key = new Date(item.date!).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Release calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reveal dates, national finals and result dates in chronological order.
        </p>
      </header>

      <ScopePicker scope={scope} editions={editions} />

      <div className="space-y-6">
        {Object.entries(groups).map(([month, items]) => (
          <section key={month} className="surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {month}
            </h2>
            <ul className="mt-3 space-y-2">
              {items.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{i.country}</span>
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="text-xs text-accent">
                    {new Date(i.date!).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {dated.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exact dates submitted yet.</p>
        ) : null}

        {undated.length > 0 ? (
          <section className="surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Approximate &amp; unknown
            </h2>
            <ul className="mt-3 space-y-2">
              {undated.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{i.country}</span>
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="text-xs text-muted-foreground">{i.approx ?? "—"}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
