import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarClock,
  Flag,
  Globe2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

import { checkAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Statistics", icon: LayoutDashboard, exact: true },
  { to: "/admin/editions", label: "Editions", icon: Flag, exact: false },
  { to: "/admin/rounds", label: "Submission rounds", icon: ListChecks, exact: false },
  { to: "/admin/responses", label: "Responses", icon: Users, exact: false },
  { to: "/admin/countries", label: "Countries", icon: Globe2, exact: false },
  { to: "/admin/calendar", label: "Release calendar", icon: CalendarClock, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const check = useServerFn(checkAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });

  if (isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading dashboard…</div>;
  }

  if (!data?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface max-w-sm p-7 text-center">
          <h1 className="text-lg font-semibold">No organiser access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account is not an administrator for the Solaris Song Contest system.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <aside className="border-b border-sidebar-border bg-sidebar md:w-60 md:border-r md:border-b-0">
        <div className="p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Solaris</p>
          <h2 className="text-solar text-lg font-bold">Contest admin</h2>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden p-3 md:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
