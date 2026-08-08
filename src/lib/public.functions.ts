import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

import type {
  AvailabilityReason,
  RoundAvailability,
} from "@/lib/ssc";

/* ============================================================
 * PUBLIC SERVER SUPABASE CLIENT
 * ========================================================== */

function getPublicServerSupabase() {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"];

  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Missing Supabase public configuration.",
    );
  }

  return createClient<Database>(
    url,
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: undefined,
      },
    },
  );
}

/* ============================================================
 * RPC HELPER
 *
 * Important:
 * Supabase rpc() must stay bound to the client because internally
 * it uses this.rest.rpc(...).
 * ========================================================== */

async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const db =
    getPublicServerSupabase();

  const boundRpc =
    db.rpc.bind(db) as unknown as (
      functionName: string,
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
  } = await boundRpc(
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
 * FORM PAYLOAD
 * ========================================================== */

const payloadSchema =
  z.object({
    round_id:
      z.string().uuid(),

    instagram_username:
      z
        .string()
        .trim()
        .min(1)
        .max(80),

    country:
      z
        .string()
        .trim()
        .min(1)
        .max(80),

    has_country_account:
      z.boolean(),

    country_account:
      z
        .string()
        .trim()
        .max(80),

    participating:
      z.boolean(),

    selection_method:
      z.enum([
        "internal",
        "national_final",
        "unknown",
        "",
      ]),

    entry_unknown:
      z.boolean(),

    nf_entries_unknown:
      z.boolean(),

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

    final_clip_start:
      z
        .string()
        .trim()
        .max(10),

    final_clip_end:
      z
        .string()
        .trim()
        .max(10),

    replacement_video_required:
      z.boolean(),

    replacement_video_url:
      z
        .string()
        .trim()
        .max(500),

    nf_name:
      z
        .string()
        .trim()
        .max(160),

    expected_entry_count:
      z
        .string()
        .trim()
        .max(4),

    nf_entries:
      z
        .array(
          z.object({
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
          }),
        )
        .max(60),

    nf_date_type:
      z.string().max(20),

    nf_exact_date:
      z.string().max(20),

    nf_approximate_text:
      z
        .string()
        .trim()
        .max(200),

    nf_result_date_type:
      z.string().max(20),

    nf_result_exact_date:
      z.string().max(20),

    nf_result_approximate_text:
      z
        .string()
        .trim()
        .max(200),

    reveal_date_type:
      z.string().max(20),

    reveal_exact_date:
      z.string().max(20),

    reveal_approximate_text:
      z
        .string()
        .trim()
        .max(200),

    browser_session_id:
      z
        .string()
        .trim()
        .max(80)
        .optional(),

    edit_token:
      z
        .string()
        .trim()
        .max(120)
        .optional(),
  });

export interface PublicRound {
  id: string;
  name: string;
  status: string;

  opens_at:
    | string
    | null;

  closes_at:
    | string
    | null;

  response_limit:
    | number
    | null;

  response_count: number;

  edition_id: string;
  edition_name: string;
  edition_number: number;
}

/* ============================================================
 * PUBLIC ROUNDS
 * ========================================================== */

export const getPublicRounds =
  createServerFn({
    method: "GET",
  }).handler(
    async (): Promise<
      PublicRound[]
    > => {
      const db =
        getPublicServerSupabase();

      const {
        data: editions,
        error: editionError,
      } = await db
        .from("editions")
        .select(
          "id, name, edition_number, status",
        )
        .eq(
          "status",
          "active",
        )
        .order(
          "edition_number",
          {
            ascending: false,
          },
        );

      if (editionError) {
        throw new Error(
          editionError.message,
        );
      }

      if (
        !editions ||
        editions.length === 0
      ) {
        return [];
      }

      const editionIds =
        editions.map(
          (edition) =>
            edition.id,
        );

      const {
        data: rounds,
        error: roundError,
      } = await db
        .from(
          "submission_rounds",
        )
        .select(
          "id, edition_id, name, status, opens_at, closes_at, response_limit, created_at",
        )
        .in(
          "edition_id",
          editionIds,
        )
        .neq(
          "status",
          "draft",
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

      if (roundError) {
        throw new Error(
          roundError.message,
        );
      }

      const {
        data: stats,
        error: statsError,
      } = await db
        .from("round_stats")
        .select(
          "round_id, submitted_count",
        );

      if (statsError) {
        throw new Error(
          statsError.message,
        );
      }

      const countMap =
        new Map<
          string,
          number
        >();

      for (
        const stat of
          stats ?? []
      ) {
        countMap.set(
          stat.round_id,
          stat.submitted_count,
        );
      }

      return (
        rounds ?? []
      ).map((round) => {
        const edition =
          editions.find(
            (item) =>
              item.id ===
              round.edition_id,
          );

        if (!edition) {
          throw new Error(
            "Round edition not found.",
          );
        }

        return {
          id: round.id,

          name:
            round.name,

          status:
            round.status,

          opens_at:
            round.opens_at,

          closes_at:
            round.closes_at,

          response_limit:
            round.response_limit,

          response_count:
            countMap.get(
              round.id,
            ) ?? 0,

          edition_id:
            round.edition_id,

          edition_name:
            edition.name,

          edition_number:
            edition.edition_number,
        };
      });
    },
  );

/* ============================================================
 * ROUND AVAILABILITY
 * ========================================================== */

export const getRoundAvailability =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data: {
          round_id: string;
        },
      ) =>
        z
          .object({
            round_id:
              z
                .string()
                .uuid(),
          })
          .parse(data),
    )
    .handler(
      async ({
        data,
      }): Promise<RoundAvailability> => {
        return rpc<RoundAvailability>(
          "round_availability",
          {
            _round_id:
              data.round_id,
          },
        );
      },
    );

/* ============================================================
 * SUBMIT CONFIRMATION
 * ========================================================== */

export const submitConfirmation =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        payloadSchema.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
      }) => {
        const {
          getClientIp,
          sha256Hex,
        } = await import(
          "@/lib/request.server"
        );

        const {
          edit_token,
          ...rest
        } = data;

        const payload: Record<
          string,
          unknown
        > = {
          ...rest,

          client_ip:
            getClientIp(),

          ...(edit_token
            ? {
                edit_token_hash:
                  await sha256Hex(
                    edit_token,
                  ),
              }
            : {}),
        };

        try {
          return await rpc<{
            ok: boolean;

            error?: string;

            reason?: AvailabilityReason;

            submission_id?: string;
          }>(
            "submit_confirmation",
            {
              payload,
            },
          );
        } catch {
          return {
            ok: false as const,
            error: "server",
          };
        }
      },
    );

/* ============================================================
 * EXISTING COUNTRY LOOKUP
 * ========================================================== */

export const lookupSubmission =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data: {
          round_id: string;
          country: string;
        },
      ) =>
        z
          .object({
            round_id:
              z
                .string()
                .uuid(),

            country:
              z
                .string()
                .trim()
                .min(1)
                .max(80),
          })
          .parse(data),
    )
    .handler(
      async ({
        data,
      }) => {
        const result =
          await rpc<{
            exists: boolean;

            can_edit?: boolean;

            submission?: unknown;
          }>(
            "public_lookup_submission",
            {
              _round_id:
                data.round_id,

              _country:
                data.country,
            },
          );

        if (!result.exists) {
          return {
            exists:
              false as const,
          };
        }

        if (
          !result.can_edit
        ) {
          return {
            exists:
              true as const,

            canEdit:
              false as const,
          };
        }

        return {
          exists:
            true as const,

          canEdit:
            true as const,

          submission:
            result.submission,
        };
      },
    );

/* ============================================================
 * DRAFTS
 * ========================================================== */

const draftSchema =
  z.object({
    round_id:
      z.string().uuid(),

    browser_session_id:
      z
        .string()
        .trim()
        .min(1)
        .max(80),

    payload_json:
      z
        .string()
        .max(200_000),
  });

export const saveDraft =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        draftSchema.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
      }) => {
        const {
          getClientIp,
        } = await import(
          "@/lib/request.server"
        );

        let parsed: {
          payload?: Record<
            string,
            unknown
          >;

          step?: number;
        };

        try {
          parsed =
            JSON.parse(
              data.payload_json,
            ) as typeof parsed;
        } catch {
          return {
            ok: false as const,
            saved_at: "",
          };
        }

        const form =
          parsed.payload ??
          {};

        return rpc<{
          ok: boolean;

          saved_at: string;
        }>(
          "public_save_draft",
          {
            _round_id:
              data.round_id,

            _browser_session_id:
              data.browser_session_id,

            _payload:
              parsed,

            _instagram_username:
              typeof form.instagram_username ===
              "string"
                ? form.instagram_username
                : "",

            _country:
              typeof form.country ===
              "string"
                ? form.country
                : "",

            _ip:
              getClientIp(),
          },
        );
      },
    );

export const loadDraft =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data: {
          round_id: string;

          browser_session_id:
            string;
        },
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
          .parse(data),
    )
    .handler(
      async ({
        data,
      }) => {
        const result =
          await rpc<{
            found: boolean;

            payload?: unknown;

            updated_at?: string;
          }>(
            "public_load_draft",
            {
              _round_id:
                data.round_id,

              _browser_session_id:
                data.browser_session_id,
            },
          );

        if (
          !result.found
        ) {
          return {
            found:
              false as const,

            payload_json:
              "",

            updated_at:
              "",
          };
        }

        return {
          found:
            true as const,

          payload_json:
            JSON.stringify(
              result.payload,
            ),

          updated_at:
            result.updated_at ??
            "",
        };
      },
    );

/* ============================================================
 * FIND SUBMISSION FROM THIS BROWSER
 * ========================================================== */

export const findMySubmission =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data: {
          round_id: string;

          browser_session_id:
            string;
        },
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
          .parse(data),
    )
    .handler(
      async ({
        data,
      }) => {
        const result =
          await rpc<{
            found: boolean;

            submission?: {
              id: string;

              country: string;

              instagram_username:
                string;

              submitted_at:
                string;

              editing_allowed:
                boolean;

              locked:
                boolean;
            };
          }>(
            "public_find_my_submission",
            {
              _round_id:
                data.round_id,

              _browser_session_id:
                data.browser_session_id,
            },
          );

        if (
          !result.found ||
          !result.submission
        ) {
          return {
            found:
              false as const,

            submission:
              null,
          };
        }

        return {
          found:
            true as const,

          submission:
            result.submission,
        };
      },
    );

/* ============================================================
 * EDIT LINKS
 * ========================================================== */

export const resolveEditToken =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data: {
          token: string;
        },
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
          .parse(data),
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

        const tokenHash =
          await sha256Hex(
            data.token,
          );

        const result =
          await rpc<{
            valid: boolean;

            reason: string;

            submission?: unknown;

            round?: {
              id: string;

              name: string;

              status: string;

              opens_at:
                | string
                | null;

              closes_at:
                | string
                | null;

              response_limit:
                | number
                | null;

              edition_id:
                string;

              edition_name:
                string;

              edition_number:
                number;
            };
          }>(
            "public_resolve_edit_token",
            {
              _token_hash:
                tokenHash,
            },
          );

        if (
          !result.valid ||
          !result.submission ||
          !result.round
        ) {
          return {
            valid:
              false as const,

            reason:
              result.reason ??
              "invalid",

            submission:
              null,

            round:
              null,
          };
        }

        const publicRound: PublicRound =
          {
            ...result.round,

            response_count:
              0,
          };

        return {
          valid:
            true as const,

          reason: "ok",

          submission:
            result.submission,

          round:
            publicRound,
        };
      },
    );
