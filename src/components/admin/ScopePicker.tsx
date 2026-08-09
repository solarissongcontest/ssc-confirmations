import {
  NEXT_IN_LINE_SCOPE,
  type AdminEdition,
  useScope,
} from "@/lib/adminHooks";

import {
  cn,
} from "@/lib/utils";

export function ScopePicker({
  scope,
  editions,
  showRounds = true,
  showNextInLine = true,
}: {
  scope: ReturnType<
    typeof useScope
  >;

  editions:
    | AdminEdition[]
    | undefined;

  showRounds?: boolean;

  showNextInLine?: boolean;
}) {
  return (
    <div className="space-y-3">
      {/* ======================================================
       * EDITIONS
       * ==================================================== */}

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex w-max min-w-full gap-2">
          {(editions ??
            []).map(
            (
              edition,
            ) => (
              <button
                key={
                  edition.id
                }
                type="button"
                onClick={() =>
                  scope.setEditionId(
                    edition.id,
                  )
                }
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors",

                  scope.editionId ===
                    edition.id
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-white/12 bg-white/5 text-muted-foreground hover:text-foreground",
                )}
              >
                {
                  edition.name
                }
              </button>
            ),
          )}
        </div>
      </div>

      {/* ======================================================
       * ROUNDS + NEXT IN LINE
       * ==================================================== */}

      {showRounds ? (
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          <div className="flex w-max min-w-full gap-2">
            <button
              type="button"
              onClick={() =>
                scope.setRoundId(
                  "",
                )
              }
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors",

                scope.roundId ===
                  ""
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-white/12 bg-white/5 text-muted-foreground hover:text-foreground",
              )}
            >
              All rounds
            </button>

            {scope.rounds.map(
              (
                round,
              ) => (
                <button
                  key={
                    round.id
                  }
                  type="button"
                  onClick={() =>
                    scope.setRoundId(
                      round.id,
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors",

                    scope.roundId ===
                      round.id
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-white/12 bg-white/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {
                    round.name
                  }
                </button>
              ),
            )}

            {showNextInLine ? (
              <button
                type="button"
                onClick={() =>
                  scope.setRoundId(
                    NEXT_IN_LINE_SCOPE,
                  )
                }
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors",

                  scope.isNextInLine
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-white/12 bg-white/5 text-muted-foreground hover:text-foreground",
                )}
              >
                Next in Line
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
