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

function getPublicServerSupabase() {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"];

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

async function rpc<T>(
  name: string,
  args:
    Record<
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

      parameters?:
        Record<
          string,
          unknown
        >,
    ) => Promise<{
      data:
        unknown;

      error:
        | {
            message:
              string;
          }
        | null;
    }>;

  const {
    data,
    error,
  } =
    await boundRpc(
      name,
      args,
    );

  if (
    error
  ) {
    throw new Error(
      error.message,
    );
  }

  return data as T;
}

const browserSchema =
  z.object({
    submission_id:
      z
        .string()
        .uuid(),

    browser_session_id:
      z
        .string()
        .trim()
        .min(1)
        .max(80),
  });

export const getRecoveryCode =
  createServerFn({
    method:
      "POST",
  })
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        browserSchema.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
      }) => {
        return rpc<{
          ok:
            boolean;

          error?:
            string;

          recovery_code?:
            string;
        }>(
          "public_get_recovery_code",
          {
            _submission_id:
              data.submission_id,

            _browser_session_id:
              data.browser_session_id,
          },
        );
      },
    );

export const setRecoveryCode =
  createServerFn({
    method:
      "POST",
  })
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        browserSchema
          .extend({
            recovery_code:
              z
                .string()
                .trim()
                .min(6)
                .max(32)
                .regex(
                  /^[A-Za-z0-9_-]+$/,
                ),
          })
          .parse(
            data,
          ),
    )
    .handler(
      async ({
        data,
      }) => {
        return rpc<{
          ok:
            boolean;

          error?:
            string;

          recovery_code?:
            string;
        }>(
          "public_set_recovery_code",
          {
            _submission_id:
              data.submission_id,

            _browser_session_id:
              data.browser_session_id,

            _recovery_code:
              data.recovery_code,
          },
        );
      },
    );

export const recoverSubmission =
  createServerFn({
    method:
      "POST",
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

            country:
              z
                .string()
                .trim()
                .min(1)
                .max(80),

            recovery_code:
              z
                .string()
                .trim()
                .min(6)
                .max(32),

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
      }) => {
        return rpc<{
          ok:
            boolean;

          error?:
            string;

          submission_id?:
            string;

          country?:
            string;

          token?:
            string;

          can_edit?:
            boolean;
        }>(
          "public_recover_submission",
          {
            _round_id:
              data.round_id,

            _country:
              data.country,

            _recovery_code:
              data.recovery_code,

            _browser_session_id:
              data.browser_session_id,
          },
        );
      },
    );
