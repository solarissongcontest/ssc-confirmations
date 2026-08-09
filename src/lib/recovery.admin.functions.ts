import {
  createServerFn,
} from "@tanstack/react-start";

import {
  requireSupabaseAuth,
} from "@/integrations/supabase/auth-middleware";

async function adminDb(
  userId:
    string,
) {
  const {
    supabaseAdmin,
  } =
    await import(
      "@/integrations/supabase/client.server"
    );

  const {
    data:
      role,
    error,
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

  if (
    error ||
    !role
  ) {
    throw new Error(
      "Forbidden",
    );
  }

  return supabaseAdmin as any;
}

export interface AdminRecoveryCode {
  id:
    string;

  country:
    string;

  instagram_username:
    string;

  recovery_code:
    string;

  submitted_at:
    string;

  round_id:
    string;

  round_name:
    string;

  edition_id:
    string;

  edition_name:
    string;

  edition_number:
    number;
}

export const getAdminRecoveryCodes =
  createServerFn({
    method:
      "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({
        context,
      }): Promise<
        AdminRecoveryCode[]
      > => {
        const db =
          await adminDb(
            context.userId,
          );

        const {
          data:
            submissions,
          error:
            submissionsError,
        } =
          await db
            .from(
              "submissions",
            )
            .select(
              "id, country, instagram_username, recovery_code, submitted_at, round_id, edition_id",
            )
            .order(
              "submitted_at",
              {
                ascending:
                  false,
              },
            );

        if (
          submissionsError
        ) {
          throw new Error(
            submissionsError.message,
          );
        }

        const roundIds =
          [
            ...new Set(
              (
                submissions ??
                []
              ).map(
                (
                  submission:
                    any,
                ) =>
                  submission.round_id,
              ),
            ),
          ];

        const editionIds =
          [
            ...new Set(
              (
                submissions ??
                []
              ).map(
                (
                  submission:
                    any,
                ) =>
                  submission.edition_id,
              ),
            ),
          ];

        const {
          data:
            rounds,
        } =
          roundIds.length
            ? await db
                .from(
                  "submission_rounds",
                )
                .select(
                  "id, name",
                )
                .in(
                  "id",
                  roundIds,
                )
            : {
                data:
                  [],
              };

        const {
          data:
            editions,
        } =
          editionIds.length
            ? await db
                .from(
                  "editions",
                )
                .select(
                  "id, name, edition_number",
                )
                .in(
                  "id",
                  editionIds,
                )
            : {
                data:
                  [],
              };

        const roundMap =
          new Map(
            (
              rounds ??
              []
            ).map(
              (
                round:
                  any,
              ) => [
                round.id,
                round.name,
              ],
            ),
          );

        const editionMap =
          new Map(
            (
              editions ??
              []
            ).map(
              (
                edition:
                  any,
              ) => [
                edition.id,
                edition,
              ],
            ),
          );

        return (
          submissions ??
          []
        ).map(
          (
            submission:
              any,
          ) => {
            const edition =
              editionMap.get(
                submission.edition_id,
              );

            return {
              id:
                submission.id,

              country:
                submission.country,

              instagram_username:
                submission.instagram_username,

              recovery_code:
                submission.recovery_code,

              submitted_at:
                submission.submitted_at,

              round_id:
                submission.round_id,

              round_name:
                roundMap.get(
                  submission.round_id,
                ) ??
                "Unknown round",

              edition_id:
                submission.edition_id,

              edition_name:
                edition?.name ??
                "Unknown edition",

              edition_number:
                edition?.edition_number ??
                0,
            };
          },
        );
      },
    );
