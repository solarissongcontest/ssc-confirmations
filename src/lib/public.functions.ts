/* ============================================================
 * NEXT IN LINE
 * ========================================================== */

export interface NextInLineCountry {
  country: string;
}

export interface NextInLineEdition {
  id: string;
  name: string;
  edition_number: number;
}

export interface NextInLineNfEntry {
  id: string;
  artist: string | null;
  song_title: string | null;
  song_url: string | null;
  position: number;
}

export const getNextInLineCountries =
  createServerFn({
    method: "GET",
  }).handler(async () => {
    return rpc<{
      ok: boolean;

      error?: string;

      edition?: NextInLineEdition;

      countries: NextInLineCountry[];
    }>(
      "public_next_in_line_countries",
      {},
    );
  });

export const getNextInLineCountry =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (
        data: {
          edition_id: string;
          country: string;
        },
      ) =>
        z
          .object({
            edition_id:
              z.string().uuid(),

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
        return rpc<{
          ok: boolean;

          error?: string;

          submission_id?: string;

          country?: string;

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

const nextInLineSubmitSchema =
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

    selection_type:
      z.enum([
        "internal",
        "national_final",
        "unknown",
      ]),

    entry_unknown:
      z.boolean(),

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
      (data: unknown) =>
        nextInLineSubmitSchema.parse(
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
            error?: string;
          }>(
            "submit_next_in_line",
            {
              payload: data,
            },
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
                  .toLowerCase()
              : String(error)
                  .toLowerCase();

          if (
            message.includes(
              "duplicate_song",
            )
          ) {
            return {
              ok: false as const,
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
              ok: false as const,
              error:
                "duplicate_artist",
            };
          }

          return {
            ok: false as const,
            error: "server",
          };
        }
      },
    );
