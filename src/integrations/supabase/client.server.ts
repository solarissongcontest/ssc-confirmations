// Server-side Supabase client.
//
// The privileged service-role client is created lazily.
// This prevents the entire application from crashing during SSR/public page
// loading when SUPABASE_SERVICE_ROLE_KEY is not configured.
//
// IMPORTANT:
// Admin/service-role operations must still require the service role key.
// Public/user-authenticated operations should use the normal Supabase client
// or authenticated middleware instead.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return (
    value.startsWith("sb_publishable_") ||
    value.startsWith("sb_secret_")
  );
}

function createSupabaseFetch(
  supabaseKey: string,
): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" &&
        input instanceof Request
        ? input.headers
        : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach(
        (value, key) =>
          headers.set(key, value),
      );
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") ===
        `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set(
      "apikey",
      supabaseKey,
    );

    return fetch(input, {
      ...init,
      headers,
    });
  };
}

function getSupabaseUrl(): string {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"];

  if (!url) {
    throw new Error(
      "Missing Supabase URL. Configure SUPABASE_URL or VITE_SUPABASE_URL.",
    );
  }

  return url;
}

function getServiceRoleKey():
  | string
  | null {
  return (
    process.env[
      "SUPABASE_SERVICE_ROLE_KEY"
    ] ?? null
  );
}

function createSupabaseAdminClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey =
    getServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error(
      "This operation requires SUPABASE_SERVICE_ROLE_KEY, but it is not configured. Admin/service-role operations are unavailable until the Supabase backend secret is connected.",
    );
  }

  return createClient<Database>(
    url,
    serviceRoleKey,
    {
      global: {
        fetch: createSupabaseFetch(
          serviceRoleKey,
        ),
      },

      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

let _supabaseAdmin:
  | ReturnType<
      typeof createSupabaseAdminClient
    >
  | undefined;

/**
 * Privileged Supabase client.
 *
 * This is intentionally lazy. Merely importing this module must NOT crash the
 * entire public application if the service-role key has not been configured.
 *
 * The error is thrown only when privileged database access is actually used.
 */
export const supabaseAdmin =
  new Proxy(
    {} as ReturnType<
      typeof createSupabaseAdminClient
    >,
    {
      get(
        _target,
        prop,
        receiver,
      ) {
        if (!_supabaseAdmin) {
          _supabaseAdmin =
            createSupabaseAdminClient();
        }

        return Reflect.get(
          _supabaseAdmin,
          prop,
          receiver,
        );
      },
    },
  );

/**
 * Lets server code check whether privileged Supabase access is available
 * without triggering an exception.
 */
export function hasSupabaseServiceRole(): boolean {
  return Boolean(
    getServiceRoleKey(),
  );
}
