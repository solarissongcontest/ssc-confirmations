import {
  createServerFn,
} from "@tanstack/react-start";

import {
  z,
} from "zod";

import {
  requireSupabaseAuth,
} from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * ADMIN CHECK
 * ========================================================== */

async function adminDb(
  userId: string,
) {
  const {
    supabaseAdmin,
  } = await import(
    "@/integrations/supabase/client.server"
  );

  const {
    data,
  } =
    await supabaseAdmin
      .from(
        "user_roles",
      )
      .select(
        "id",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "role",
        "admin",
      )
      .maybeSingle();

  if (!data) {
    throw new Error(
      "Forbidden",
    );
  }

  return supabaseAdmin;
}

/* ============================================================
 * EDITION EDITING
 * ========================================================== */

export const setEditionEditing =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (
        input:
          unknown,
      ) =>
        z
          .object({
            edition_id:
              z
                .string()
                .uuid(),

            enabled:
              z.boolean(),
          })
          .parse(
            input,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await adminDb(
            context.userId,
          );

        const {
          error,
        } =
          await (
            db as any
          )
            .from(
              "editions",
            )
            .update({
              editing_enabled:
                data.enabled,
            })
            .eq(
              "id",
              data.edition_id,
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return {
          ok: true,
        };
      },
    );

/* ============================================================
 * ROUND EDITING
 * ========================================================== */

export const setRoundEditing =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (
        input:
          unknown,
      ) =>
        z
          .object({
            round_id:
              z
                .string()
                .uuid(),

            enabled:
              z.boolean(),
          })
          .parse(
            input,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await adminDb(
            context.userId,
          );

        const {
          error,
        } =
          await (
            db as any
          )
            .from(
              "submission_rounds",
            )
            .update({
              editing_enabled:
                data.enabled,
            })
            .eq(
              "id",
              data.round_id,
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return {
          ok: true,
        };
      },
    );
