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

/* ============================================================
 * PUBLIC SUPABASE CLIENT
 * ========================================================== */

function getPublicServerSupabase() {
  const url =
    process.env[
      "SUPABASE_URL"
    ] ||
    process.env[
      "VITE_SUPABASE_URL"
    ];

  const key =
    process.env[
      "SUPABASE_PUBLISHABLE_KEY"
    ] ||
    process.env[
      "VITE_SUPABASE_PUBLISHABLE_KEY"
    ];

  if (
    !url ||
    !key
  ) {
    throw new Error(
      "Missing Supabase public configuration.",
    );
  }

  return createClient<Database>(
    url,
    key,
    {
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

/* ============================================================
 * RPC HELPER
 * ========================================================== */

async function rpc<T>(
  name: string,

  args: Record<
    string,
    unknown
  >,
): Promise<T> {
  const db =
    getPublicServerSupabase();

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
        message:
          string;
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
 * TYPES
 * ========================================================== */

export interface NextInLineCountry {
  country: string;
}

export interface NextInLineEdition {
  id: string;

  name: string;

  edition_number:
    number;
}

export interface NextInLineNfEntry {
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

  position:
    number;
}

/* ============================================================
 * COUNTRIES
 * ========================================================== */

export const getNextInLineCountries =
  createServerFn({
    method: "GET",
  }).handler(
    async () => {
      return rpc<{
        ok: boolean;

        error?: string;

        edition?:
          NextInLineEdition;

        countries:
          NextInLineCountry[];
      }>(
        "public_next_in_line_countries",
        {},
      );
    },
  );

/* ============================================================
 * COUNTRY DETAILS
 * ========================================================== */

const countrySchema =
  z.object({
    edition_id:
      z.string().uuid(),

    country:
      z
        .string()
        .trim()
        .min(1)
        .max(80),
  });

export const getNextInLineCountry =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        countrySchema.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
      }) => {
        return rpc<{
          ok: boolean;

          error?: string;

          submission_id?:
            string;

          country?:
            string;

          selection_method?:
            | "internal"
            | "national_final"
            | "unknown";

          entries:
            NextInLineNfEntry[];
        }>(
          "public_next_in_line_country",
          {
            _edition_id:
              data.edition_id,

            _country:
              data.country,
          },
        );
      },
    );

/* ============================================================
 * SUBMIT
 * ========================================================== */

const submitSchema =
  z.object({
    edition_id:
      z.string().uuid(),

    source_submission_id:
      z.string().uuid(),

    country:
      z
        .string()
        .trim()
        .min(1)
        .max(80),

    participating:
      z.boolean(),

    entry_unknown:
      z.boolean(),

    selection_type:
      z.enum([
        "none",
        "unknown",
        "internal",
        "national_final",
      ]),

    national_final_entry_id:
      z
        .string()
        .uuid()
        .nullable()
        .optional(),

    artist:
      z
        .string()
        .trim()
        .max(160),

    song_title:
      z
        .string()
        .trim()
        .max(160),

    song_url:
      z
        .string()
        .trim()
        .max(500),

    preview_start:
      z
        .string()
        .trim()
        .max(10),

    preview_end:
      z
        .string()
        .trim()
        .max(10),
  });

export const submitNextInLine =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        submitSchema.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
      }) => {
        try {
          return await rpc<{
            ok: boolean;

            error?:
              string;
          }>(
            "submit_next_in_line",
            {
              payload:
                data,
            },
          );
        } catch (
          error
        ) {
          const message =
            error instanceof
            Error
              ? error.message.toLowerCase()
              : String(
                  error,
                ).toLowerCase();

          if (
            message.includes(
              "duplicate_song",
            )
          ) {
            return {
              ok:
                false as const,

              error:
                "duplicate_song",
            };
          }

          if (
            message.includes(
              "duplicate_artist",
            )
          ) {
            return {
              ok:
                false as const,

              error:
                "duplicate_artist",
            };
          }

          return {
            ok:
              false as const,

            error:
              "server",
          };
        }
      },
    );
