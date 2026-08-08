import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScopePicker } from "@/components/admin/ScopePicker";
import { useEditions, useScope, useSubmissions } from "@/lib/adminHooks";
import { songSubmitted, statusOf } from "@/lib/adminModel";

export const Route = createFileRoute(
  "/_authenticated/admin/countries",
)({
  component: CountriesPage,
});

function CountriesPage() {
  const { data: editions } = useEditions();

  const scope = useScope(editions);

  const { data: submissions } = useSubmissions(
    scope.editionId
      ? {
          edition_id: scope.editionId,
        }
      : {},
  );

  const [copied, setCopied] =
    useState(false);

  const countries = useMemo(() => {
    const map = new Map<
      string,
      typeof submissions extends undefined
        ? never
        : any[]
    >();

    for (const submission of submissions ?? []) {
      const existing =
        map.get(submission.country) ?? [];

      existing.push(submission);

      map.set(
        submission.country,
        existing,
      );
    }

    return [...map.entries()].sort(
      (a, b) =>
        a[0].localeCompare(b[0]),
    );
  }, [submissions]);

  const participatingCountries =
    useMemo(() => {
      return countries
        .filter(([, rows]) =>
          rows.some(
            (row: any) =>
              row.participating === true,
          ),
        )
        .map(([country]) => country);
    }, [countries]);

  async function copyParticipatingCountries() {
    const text =
      participatingCountries.join(", ");

    try {
      await navigator.clipboard.writeText(
        text,
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1800,
      );
    } catch {
      /*
       * Fallback for browsers where the
       * Clipboard API is unavailable.
       */
      const textarea =
        document.createElement(
          "textarea",
        );

      textarea.value = text;
      textarea.style.position =
        "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(
        textarea,
      );

      textarea.select();

      document.execCommand(
        "copy",
      );

      textarea.remove();

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1800,
      );
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">
          Countries
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Each delegation and everything they submitted in this edition.
        </p>
      </header>

      <ScopePicker
        scope={scope}
        editions={editions}
        showRounds={false}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {
              participatingCountries.length
            }
          </span>{" "}
          participating
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={
            copyParticipatingCountries
          }
          disabled={
            participatingCountries.length ===
            0
          }
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy countries
            </>
          )}
        </Button>
      </div>

      <div className="space-y-2">
        {countries.map(
          ([country, rows]) => {
            const latest =
              rows[0];

            const participating =
              rows.some(
                (row: any) =>
                  row.participating ===
                  true,
              );

            return (
              <div
                key={country}
                className="surface overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold leading-tight">
                        {country}
                      </h2>

                      {!participating ? (
                        <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Not participating
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      @
                      {
                        latest.instagram_username
                      }
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {statusOf(latest)}
                  </span>
                </div>

                <div className="border-t border-border/60">
                  {rows.map(
                    (submission: any) => (
                      <Link
                        key={
                          submission.id
                        }
                        to="/admin/responses/$id"
                        params={{
                          id: submission.id,
                        }}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-secondary/30"
                      >
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                          {submission
                            .submission_rounds
                            ?.name ??
                            "Round"}
                        </span>

                        <span className="shrink-0 text-xs text-foreground">
                          {submission.participating
                            ? songSubmitted(
                                submission,
                              )
                              ? "Song submitted"
                              : "Awaiting song"
                            : "Not participating"}
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              </div>
            );
          },
        )}

        {countries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No responses in this edition yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
