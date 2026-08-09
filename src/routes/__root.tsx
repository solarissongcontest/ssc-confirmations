import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import {
  useEffect,
  type ReactNode,
} from "react";

import {
  Toaster,
} from "@/components/ui/sonner";

import appCss from "../styles.css?url";

import {
  reportLovableError,
} from "../lib/lovable-error-reporting";

function describeRouteError(
  error: unknown,
) {
  if (
    error instanceof Response
  ) {
    return [
      `Response error`,
      `Status: ${error.status}`,
      `Status text: ${error.statusText || "(none)"}`,
      `URL: ${error.url || "(none)"}`,
    ].join("\n");
  }

  if (
    error instanceof Error
  ) {
    return [
      `${error.name}: ${error.message}`,
      "",
      error.stack ??
        "No stack trace available.",
    ].join("\n");
  }

  try {
    return JSON.stringify(
      error,
      null,
      2,
    );
  } catch {
    return String(
      error,
    );
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you're
          looking for doesn't
          exist or has been
          moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router =
    useRouter();

  const details =
    describeRouteError(
      error,
    );

  /*
   * Log as a STRING rather than passing the Error object directly.
   * Cloudflare is much more likely to preserve the useful message
   * in Workers Logs this way.
   */
  console.error(
    `[ROOT_ROUTE_ERROR]\n${details}`,
  );

  useEffect(() => {
    reportLovableError(
      error,
      {
        boundary:
          "tanstack_root_error_component",
      },
    );
  }, [
    error,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="surface p-5 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            This page didn't
            load
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The actual error
            is shown below
            temporarily so we
            can fix the
            Cloudflare
            deployment.
          </p>

          <pre className="mt-5 max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-left text-xs leading-relaxed text-foreground">
            {details}
          </pre>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>

            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<{
    queryClient:
      QueryClient;
  }>()({
    head: () => ({
      meta: [
        {
          charSet:
            "utf-8",
        },

        {
          name:
            "viewport",

          content:
            "width=device-width, initial-scale=1",
        },

        {
          title:
            "Solaris Song Contest — Confirmations",
        },

        {
          name:
            "description",

          content:
            "Confirm your delegation's participation and submit your entry for the Solaris Song Contest.",
        },

        {
          property:
            "og:title",

          content:
            "Solaris Song Contest — Confirmations",
        },

        {
          property:
            "og:description",

          content:
            "Confirm your delegation's participation and submit your entry for the Solaris Song Contest.",
        },

        {
          property:
            "og:type",

          content:
            "website",
        },

        {
          name:
            "twitter:card",

          content:
            "summary_large_image",
        },
      ],

      links: [
        {
          rel:
            "stylesheet",

          href:
            appCss,
        },

        {
          rel:
            "icon",

          href:
            "/favicon.ico",

          type:
            "image/x-icon",
        },

        {
          rel:
            "preconnect",

          href:
            "https://fonts.googleapis.com",
        },

        {
          rel:
            "preconnect",

          href:
            "https://fonts.gstatic.com",

          crossOrigin:
            "anonymous",
        },

        {
          rel:
            "stylesheet",

          href:
            "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap",
        },
      ],
    }),

    shellComponent:
      RootShell,

    component:
      RootComponent,

    notFoundComponent:
      NotFoundComponent,

    errorComponent:
      ErrorComponent,
  });

function RootShell({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>

      <body>
        {children}

        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const {
    queryClient,
  } =
    Route.useRouteContext();

  return (
    <QueryClientProvider
      client={
        queryClient
      }
    >
      <Outlet />

      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
