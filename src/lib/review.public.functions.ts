import {
  createServerFn,
} from "@tanstack/react-start";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  z,
} from "zod";

import type {
  Database,
} from "@/integrations/supabase/types";

export type PublicReviewStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "removed";

export interface PublicReviewEntry {
  id: string;

  artist:
    | string
    | null;

  song_title:
    | string
    | null;

  song_url:
    | string
    | null;

  review_status:
    PublicReviewStatus;

  review_reason:
    | string
    | null;

  reviewed_at:
    | string
    | null;

  position?:
    number;

  removed?:
    boolean;

  removed_at?:
    | string
    | null;
}

export interface PublicReviewHistoryItem {
  id: string;

  target_type:
    "internal"
    | "national_final";

  artist:
    | string
    | null;

  song_title:
    | string
    | null;

  action:
    string;

  reason:
    string;

  created_at:
    string;
}

export interface PublicReviewPayload {
  found: boolean;

  submission_id?:
    string;

  country?:
    string;

  selection_method?:
    string | null;

  overall_status?:
    "pending"
    | "accepted"
    | "declined";

  reviewed?:
    boolean;

  internal_entry?:
    PublicReviewEntry | null;

  nf_entries?:
    PublicReviewEntry[];

  history?:
    PublicReviewHistoryItem[];
}

function isNewSupabaseApiKey(
  value: string,
) {
  return (
    value.startsWith(
      "sb_publishable_",
    ) ||
    value.startsWith(
      "sb_secret_",
    )
  );
}

function createSupabaseFetch(
  key: string,
): typeof fetch {
  return (
    input,
    init,
  ) => {
    const headers =
      new Headers(
        typeof Request !==
          "undefined" &&
        input instanceof
          Request
          ? input.headers
          : undefined,
      );

    if (
      init?.headers
    ) {
      new Headers(
        init.headers,
      ).forEach(
        (
          value,
          name,
        ) =>
          headers.set(
            name,
            value,
          ),
      );
    }

    if (
      isNewSupabaseApiKey(
        key,
      ) &&
      headers.get(
        "Authorization",
      ) ===
        `Bearer ${key}`
    ) {
      headers.delete(
        "Authorization",
      );
    }

    headers.set(
      "apikey",
      key,
    );

    return fetch(
      input,
      {
        ...init,
        headers,
      },
    );
  };
}

function getPublicDb() {
  const url =
    import.meta.env[
      "VITE_SUPABASE_URL"
    ] ||
    process.env[
      "SUPABASE_URL"
    ];

  const key =
    import.meta.env[
      "VITE_SUPABASE_PUBLISHABLE_KEY"
    ] ||
    process.env[
      "SUPABASE_PUBLISHABLE_KEY"
    ];

  if (
    !url ||
    !key
  ) {
    throw new Error(
      "Missing Supabase configuration.",
    );
  }

  return createClient<Database>(
    url,
    key,
    {
      global: {
        fetch:
          createSupabaseFetch(
            key,
          ),
      },

      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        storage:
          undefined,
      },
    },
  );
}

async function rpc<T>(
  name: string,
  args: Record<
    string,
    unknown
  >,
) {
  const db =
    getPublicDb();

  const boundRpc =
    db.rpc.bind(
      db,
    ) as unknown as (
      functionName:
        string,
      parameters?: Record<
        string,
        unknown
      >,
    ) => Promise<{
      data: unknown;
      error: {
        message: string;
      } | null;
    }>;

  const {
    data,
    error,
  } =
    await boundRpc(
      name,
      args,
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as T;
}

/* ============================================================
 * BROWSER SESSION
 * ========================================================== */

export const getMyReviewStatus =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        z
          .object({
            round_id:
              z
                .string()
                .uuid(),

            browser_session_id:
              z
                .string()
                .trim()
                .min(1)
                .max(80),
          })
          .parse(
            data,
          ),
    )
    .handler(
      async ({
        data,
      }) =>
        rpc<PublicReviewPayload>(
          "public_get_my_review_status",
          {
            _round_id:
              data.round_id,

            _browser_session_id:
              data.browser_session_id,
          },
        ),
    );

/* ============================================================
 * EDIT TOKEN
 * ========================================================== */

export const getTokenReviewStatus =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        z
          .object({
            token:
              z
                .string()
                .trim()
                .min(10)
                .max(120),
          })
          .parse(
            data,
          ),
    )
    .handler(
      async ({
        data,
      }) => {
        const {
          sha256Hex,
        } = await import(
          "@/lib/request.server"
        );

        const hash =
          await sha256Hex(
            data.token,
          );

        return rpc<PublicReviewPayload>(
          "public_get_token_review_status",
          {
            _token_hash:
              hash,
          },
        );
      },
    );
