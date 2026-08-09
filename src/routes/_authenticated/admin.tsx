import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  CalendarClock,
  ExternalLink,
  Flag,
  Globe2,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

import {
  checkAdmin,
} from "@/lib/admin.functions";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  Button,
} from "@/components/ui/button";

export const Route =
  createFileRoute(
    "/_authenticated/admin",
  )({
    component:
      AdminLayout,
  });

const NAV = [
  {
    to:
      "/admin",

    label:
      "Statistics",

    icon:
      LayoutDashboard,

    exact:
      true,
  },

  {
    to:
      "/admin/editions",

    label:
      "Editions",

    icon:
      Flag,

    exact:
      false,
  },

  {
    to:
      "/admin/rounds",

    label:
      "Rounds",

    icon:
      ListChecks,

    exact:
      false,
  },

  {
    to:
      "/admin/responses",

    label:
      "Responses",

    icon:
      Users,

    exact:
      false,
  },

  {
    to:
      "/admin/recovery-codes",

    label:
      "Recovery codes",

    icon:
      KeyRound,

    exact:
      false,
  },

  {
    to:
      "/admin/countries",

    label:
      "Countries",

    icon:
      Globe2,

    exact:
      false,
  },

  {
    to:
      "/admin/calendar",

    label:
      "Calendar",

    icon:
      CalendarClock,

    exact:
      false,
  },

  {
    to:
      "/admin/settings",

    label:
      "Settings",

    icon:
      Settings,

    exact:
      false,
  },
] as const;

function AdminLayout() {
  const navigate =
    useNavigate();

  const check =
    useServerFn(
      checkAdmin,
    );

  const {
    data,
    isLoading,
  } =
    useQuery({
      queryKey: [
        "is-admin",
      ],

      queryFn:
        () =>
          check(),
    });

  if (
    isLoading
  ) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  if (
    !data?.isAdmin
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface w-full max-w-sm p-7 text-center">
          <h1 className="text-lg">
            No organiser access
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            This account is
            not an
            administrator
            for the Solaris
            Song Contest
            system.
          </p>

          <Button
            variant="outline"
            className="mt-5"
            onClick={async () => {
              await supabase.auth.signOut();

              navigate({
                to:
                  "/auth",
              });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full md:flex">
      <aside className="border-b border-sidebar-border bg-sidebar/65 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-4 pt-5 pb-3 md:p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Solaris
          </p>

          <h2 className="text-solar text-xl">
            Contest admin
          </h2>
        </div>

        {/* MOBILE NAV */}

        <div className="relative md:hidden">
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map(
              (
                item,
              ) => (
                <Link
                  key={
                    item.to
                  }
                  to={
                    item.to
                  }
                  activeOptions={{
                    exact:
                      item.exact,
                  }}
                  activeProps={{
                    className:
                      "border-accent/60 bg-accent/12 text-foreground",
                  }}
                  inactiveProps={{
                    className:
                      "border-white/10 bg-white/5 text-muted-foreground",
                  }}
                  className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors"
                >
                  <item.icon className="size-3.5" />

                  <span>
                    {
                      item.label
                    }
                  </span>
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="px-4 pb-4 md:hidden">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <Link to="/">
              <ExternalLink className="size-4" />

              Public form
            </Link>
          </Button>
        </div>

        {/* DESKTOP NAV */}

        <nav className="hidden flex-col gap-1 px-3 md:flex">
          {NAV.map(
            (
              item,
            ) => (
              <Link
                key={
                  item.to
                }
                to={
                  item.to
                }
                activeOptions={{
                  exact:
                    item.exact,
                }}
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                }}
                inactiveProps={{
                  className:
                    "text-muted-foreground",
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="size-4" />

                {
                  item.label
                }
              </Link>
            ),
          )}
        </nav>

        <div className="hidden px-3 pt-4 md:block">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/">
              <ExternalLink className="size-4" />

              Public form
            </Link>
          </Button>
        </div>

        <div className="hidden p-3 md:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              await supabase.auth.signOut();

              navigate({
                to:
                  "/auth",
              });
            }}
          >
            <LogOut className="size-4" />

            Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
