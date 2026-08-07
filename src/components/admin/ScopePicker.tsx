import type { AdminEdition, useScope } from "@/lib/adminHooks";
import { cn } from "@/lib/utils";

export function ScopePicker({
  scope,
  editions,
  showRounds = true,
}: {
  scope: ReturnType<typeof useScope>;
  editions: AdminEdition[] | undefined;
  showRounds?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(editions ?? []).map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => scope.setEditionId(e.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              scope.editionId === e.id
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {e.name}
          </button>
        ))}
      </div>
      {showRounds ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => scope.setRoundId("")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              scope.roundId === ""
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            All rounds
          </button>
          {scope.rounds.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => scope.setRoundId(r.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                scope.roundId === r.id
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
