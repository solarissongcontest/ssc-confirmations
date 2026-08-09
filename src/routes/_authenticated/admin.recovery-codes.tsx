import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  Copy,
  KeyRound,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  getAdminRecoveryCodes,
} from "@/lib/recovery.admin.functions";

import {
  Button,
} from "@/components/ui/button";

export const Route =
  createFileRoute(
    "/_authenticated/admin/recovery-codes",
  )({
    component:
      RecoveryCodesPage,
  });

function RecoveryCodesPage() {
  const getCodes =
    useServerFn(
      getAdminRecoveryCodes,
    );

  const {
    data,
    isLoading,
  } =
    useQuery({
      queryKey: [
        "admin-recovery-codes",
      ],

      queryFn:
        () =>
          getCodes(),
    });

  if (
    isLoading
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading recovery
        codes…
      </p>
    );
  }

  const rows =
    data ??
    [];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-accent">
          <KeyRound className="size-5" />

          <p className="text-xs uppercase tracking-widest">
            Edit access
          </p>
        </div>

        <h1 className="mt-2 text-3xl font-semibold">
          Recovery codes
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every submitted
          response receives a
          recovery code
          automatically.
          Delegations can
          replace the random
          code with their own
          code after
          submitting.
        </p>
      </header>

      <div className="surface overflow-hidden">
        {rows.length ===
        0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No submissions
            yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map(
              (
                row,
              ) => (
                <div
                  key={
                    row.id
                  }
                  className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">
                        {
                          row.country
                        }
                      </h2>

                      <span className="text-xs text-muted-foreground">
                        @
                        {
                          row.instagram_username
                        }
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {
                        row.edition_name
                      }
                      {" · "}
                      {
                        row.round_name
                      }
                    </p>

                    <code className="mt-3 inline-block rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-sm font-semibold tracking-wider">
                      {
                        row.recovery_code
                      }
                    </code>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        row.recovery_code,
                      );

                      toast.success(
                        `${row.country} recovery code copied`,
                      );
                    }}
                  >
                    <Copy className="size-4" />

                    Copy
                  </Button>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        These codes grant
        access to delegation
        responses. Treat them
        as private
        credentials.
      </p>
    </div>
  );
}
