import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { checkAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const check = useServerFn(checkAdmin);
  const { data } = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });
  const { data: session } = useQuery({
    queryKey: ["session-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const publicUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account and system information.</p>
      </header>

      <section className="surface space-y-3 p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Signed in as</span>
          <span className="font-medium">{session?.email ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Role</span>
          <span className="font-medium">{data?.isAdmin ? "Administrator" : "No access"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Public form link</span>
          <span className="truncate font-medium">{publicUrl}</span>
        </div>
      </section>

      <section className="surface space-y-3 p-5">
        <h2 className="text-sm font-semibold">How the system is reused each edition</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Create a new edition (e.g. SSC 24) on the Editions page.</li>
          <li>Add submission rounds with an optional response limit.</li>
          <li>Set a round to Open — it appears on the public form automatically.</li>
          <li>Rounds close themselves once the response limit is reached.</li>
        </ol>
      </section>

      <Button
        variant="outline"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/auth";
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
