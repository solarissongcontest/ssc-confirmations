import {
  createServerFn,
} from "@tanstack/react-start";

import {
  z,
} from "zod";

import {
  requireSupabaseAuth,
} from "@/integrations/supabase/auth-middleware";

type ReviewStatus =
  | "pending"
  | "accepted"
  | "declined";

type NfReviewStatus =
  | ReviewStatus
  | "removed";

async function assertReviewAdmin(
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

  return supabaseAdmin as any;
}

async function refreshSubmissionReviewed(
  db: any,
  submissionId: string,
) {
  const {
    data:
      internal,
  } =
    await db
      .from(
        "internal_entries",
      )
      .select(
        "review_status",
      )
      .eq(
        "submission_id",
        submissionId,
      )
      .maybeSingle();

  let reviewed =
    false;

  if (internal) {
    reviewed =
      internal.review_status !==
      "pending";
  } else {
    const {
      data:
        nationalFinal,
    } =
      await db
        .from(
          "national_finals",
        )
        .select(
          "id",
        )
        .eq(
          "submission_id",
          submissionId,
        )
        .maybeSingle();

    if (
      nationalFinal
    ) {
      const {
        data:
          entries,
      } =
        await db
          .from(
            "national_final_entries",
          )
          .select(
            "review_status",
          )
          .eq(
            "national_final_id",
            nationalFinal.id,
          );

      const list =
        entries ??
        [];

      reviewed =
        list.length >
          0 &&
        list.every(
          (
            entry: {
              review_status:
                string;
            },
          ) =>
            entry.review_status !==
            "pending",
        );
    }
  }

  await db
    .from(
      "submissions",
    )
    .update({
      reviewed,
    })
    .eq(
      "id",
      submissionId,
    );
}

const reasonSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "A reason is required.",
    )
    .max(
      2000,
    );

/* ============================================================
 * INTERNAL ENTRY REVIEW
 * ========================================================== */

export const reviewInternalEntry =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        z
          .object({
            entry_id:
              z
                .string()
                .uuid(),

            status:
              z.enum([
                "pending",
                "accepted",
                "declined",
              ]),

            reason:
              reasonSchema,
          })
          .parse(
            data,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await assertReviewAdmin(
            context.userId,
          );

        const {
          data:
            entry,
          error:
            entryError,
        } =
          await db
            .from(
              "internal_entries",
            )
            .select(
              "id, submission_id, artist, song_title",
            )
            .eq(
              "id",
              data.entry_id,
            )
            .maybeSingle();

        if (
          entryError ||
          !entry
        ) {
          throw new Error(
            "Entry not found.",
          );
        }

        const {
          error,
        } =
          await db
            .from(
              "internal_entries",
            )
            .update({
              review_status:
                data.status,

              review_reason:
                data.reason,

              reviewed_at:
                new Date()
                  .toISOString(),

              reviewed_by:
                context.userId,
            })
            .eq(
              "id",
              data.entry_id,
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        const {
          error:
            historyError,
        } =
          await db
            .from(
              "submission_review_history",
            )
            .insert({
              submission_id:
                entry.submission_id,

              target_type:
                "internal",

              target_entry_id:
                entry.id,

              artist_snapshot:
                entry.artist,

              song_title_snapshot:
                entry.song_title,

              action:
                data.status,

              reason:
                data.reason,

              admin_user_id:
                context.userId,
            });

        if (
          historyError
        ) {
          throw new Error(
            historyError.message,
          );
        }

        await refreshSubmissionReviewed(
          db,
          entry.submission_id,
        );

        return {
          ok: true,
        };
      },
    );

/* ============================================================
 * NATIONAL FINAL ENTRY REVIEW / REMOVAL
 * ========================================================== */

export const reviewNationalFinalEntry =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        z
          .object({
            entry_id:
              z
                .string()
                .uuid(),

            status:
              z.enum([
                "pending",
                "accepted",
                "declined",
                "removed",
              ]),

            reason:
              reasonSchema,
          })
          .parse(
            data,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await assertReviewAdmin(
            context.userId,
          );

        const {
          data:
            entry,
          error:
            entryError,
        } =
          await db
            .from(
              "national_final_entries",
            )
            .select(
              "id, national_final_id, artist, song_title",
            )
            .eq(
              "id",
              data.entry_id,
            )
            .maybeSingle();

        if (
          entryError ||
          !entry
        ) {
          throw new Error(
            "Entry not found.",
          );
        }

        const {
          data:
            nationalFinal,
          error:
            nfError,
        } =
          await db
            .from(
              "national_finals",
            )
            .select(
              "id, submission_id, winning_entry_id",
            )
            .eq(
              "id",
              entry.national_final_id,
            )
            .maybeSingle();

        if (
          nfError ||
          !nationalFinal
        ) {
          throw new Error(
            "National Final not found.",
          );
        }

        const removed =
          data.status ===
          "removed";

        const {
          error,
        } =
          await db
            .from(
              "national_final_entries",
            )
            .update({
              review_status:
                data.status,

              review_reason:
                data.reason,

              reviewed_at:
                new Date()
                  .toISOString(),

              reviewed_by:
                context.userId,

              removed,

              removed_at:
                removed
                  ? new Date()
                      .toISOString()
                  : null,
            })
            .eq(
              "id",
              data.entry_id,
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (
          removed &&
          nationalFinal.winning_entry_id ===
            entry.id
        ) {
          await db
            .from(
              "national_finals",
            )
            .update({
              winning_entry_id:
                null,
            })
            .eq(
              "id",
              nationalFinal.id,
            );
        }

        const {
          error:
            historyError,
        } =
          await db
            .from(
              "submission_review_history",
            )
            .insert({
              submission_id:
                nationalFinal.submission_id,

              target_type:
                "national_final",

              target_entry_id:
                entry.id,

              artist_snapshot:
                entry.artist,

              song_title_snapshot:
                entry.song_title,

              action:
                data.status,

              reason:
                data.reason,

              admin_user_id:
                context.userId,
            });

        if (
          historyError
        ) {
          throw new Error(
            historyError.message,
          );
        }

        await refreshSubmissionReviewed(
          db,
          nationalFinal.submission_id,
        );

        return {
          ok: true,
        };
      },
    );

/* ============================================================
 * NF WINNER CHANGE
 *
 * Also requires a visible reason because this changes an entry.
 * ========================================================== */

export const setWinningEntryWithReason =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        z
          .object({
            national_final_id:
              z
                .string()
                .uuid(),

            entry_id:
              z
                .string()
                .uuid()
                .nullable(),

            reason:
              reasonSchema,
          })
          .parse(
            data,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await assertReviewAdmin(
            context.userId,
          );

        const {
          data:
            nationalFinal,
          error:
            nfError,
        } =
          await db
            .from(
              "national_finals",
            )
            .select(
              "id, submission_id, winning_entry_id",
            )
            .eq(
              "id",
              data.national_final_id,
            )
            .maybeSingle();

        if (
          nfError ||
          !nationalFinal
        ) {
          throw new Error(
            "National Final not found.",
          );
        }

        const targetId =
          data.entry_id ??
          nationalFinal.winning_entry_id;

        if (!targetId) {
          throw new Error(
            "No entry selected.",
          );
        }

        const {
          data:
            entry,
          error:
            entryError,
        } =
          await db
            .from(
              "national_final_entries",
            )
            .select(
              "id, national_final_id, artist, song_title, removed",
            )
            .eq(
              "id",
              targetId,
            )
            .maybeSingle();

        if (
          entryError ||
          !entry ||
          entry.national_final_id !==
            nationalFinal.id
        ) {
          throw new Error(
            "Entry not found.",
          );
        }

        if (
          data.entry_id &&
          entry.removed
        ) {
          throw new Error(
            "A removed entry cannot be the winner.",
          );
        }

        const {
          error,
        } =
          await db
            .from(
              "national_finals",
            )
            .update({
              winning_entry_id:
                data.entry_id,
            })
            .eq(
              "id",
              nationalFinal.id,
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        const action =
          data.entry_id
            ? "winner_selected"
            : "winner_cleared";

        const {
          error:
            historyError,
        } =
          await db
            .from(
              "submission_review_history",
            )
            .insert({
              submission_id:
                nationalFinal.submission_id,

              target_type:
                "national_final",

              target_entry_id:
                entry.id,

              artist_snapshot:
                entry.artist,

              song_title_snapshot:
                entry.song_title,

              action,

              reason:
                data.reason,

              admin_user_id:
                context.userId,
            });

        if (
          historyError
        ) {
          throw new Error(
            historyError.message,
          );
        }

        return {
          ok: true,
        };
      },
    );

/* ============================================================
 * ADMIN REVIEW HISTORY
 * ========================================================== */

export const getReviewHistory =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      (
        data:
          unknown,
      ) =>
        z
          .object({
            submission_id:
              z
                .string()
                .uuid(),
          })
          .parse(
            data,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await assertReviewAdmin(
            context.userId,
          );

        const {
          data:
            history,
          error,
        } =
          await db
            .from(
              "submission_review_history",
            )
            .select(
              "*",
            )
            .eq(
              "submission_id",
              data.submission_id,
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return history ??
          [];
      },
    );
