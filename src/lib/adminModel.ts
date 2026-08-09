import type {
  ConfirmationPayload,
  DateType,
} from "@/lib/ssc";

/**
 * Map a stored submission row onto the form payload shape.
 *
 * Important:
 * - Internal entries use the normal top-level artist/song/technical fields.
 * - National Final submissions ALSO use those top-level technical fields,
 *   but only as the selected NF winner's details.
 * - selection_method remains "national_final".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prefillFromSubmission(
  s: any,
  base: ConfirmationPayload,
): ConfirmationPayload {
  const internal =
    s.internal_entries;

  const nf =
    s.national_finals;

  const allNfEntries =
    (
      nf?.national_final_entries ??
      []
    )
      .slice()
      .sort(
        (
          a: {
            position:
              number;
          },
          b: {
            position:
              number;
          },
        ) =>
          (
            a.position ??
            0
          ) -
          (
            b.position ??
            0
          ),
      );

  /*
   * Admin-removed entries should remain visible through the
   * review/moderation history, but should not be put back into
   * the participant's editable National Final entry list.
   */
  const editableNfEntries =
    allNfEntries.filter(
      (
        entry: {
          removed?:
            boolean;
        },
      ) =>
        !entry.removed,
    );

  const winner =
    nf?.winning_entry_id
      ? allNfEntries.find(
          (
            entry: {
              id:
                string;
            },
          ) =>
            entry.id ===
            nf.winning_entry_id,
        )
      : null;

  const isNationalFinal =
    s.selection_method ===
    "national_final";

  const songSource =
    isNationalFinal
      ? winner
      : internal;

  return {
    ...base,

    instagram_username:
      s.instagram_username ??
      base.instagram_username,

    country:
      s.country ??
      base.country,

    country_account:
      s.country_account ??
      "",

    has_country_account:
      s.has_country_account ??
      false,

    participating:
      s.participating ??
      true,

    selection_method:
      (
        s.selection_method ??
        ""
      ) as ConfirmationPayload["selection_method"],

    entry_unknown:
      s.entry_unknown ??
      false,

    nf_entries_unknown:
      s.nf_entries_unknown ??
      false,

    /*
     * For an internal selection this is the internal song.
     *
     * For a National Final this is the currently selected winner.
     * That lets the existing payload carry winner identity and
     * technical details without changing the selection method.
     */
    artist:
      songSource?.artist ??
      "",

    song_title:
      songSource?.song_title ??
      "",

    song_url:
      songSource?.song_url ??
      "",

    preview_start:
      songSource?.preview_start ??
      "",

    preview_end:
      songSource?.preview_end ??
      "",

    final_clip_start:
      songSource?.final_clip_start ??
      "",

    final_clip_end:
      songSource?.final_clip_end ??
      "",

    replacement_video_required:
      songSource
        ?.replacement_video_required ??
      false,

    replacement_video_url:
      songSource
        ?.replacement_video_url ??
      "",

    nf_name:
      nf?.nf_name ??
      "",

    expected_entry_count:
      nf?.expected_entry_count
        ? String(
            nf.expected_entry_count,
          )
        : "",

    nf_entries:
      editableNfEntries.map(
        (
          entry: {
            artist:
              | string
              | null;

            song_title:
              | string
              | null;

            song_url:
              | string
              | null;
          },
        ) => ({
          artist:
            entry.artist ??
            "",

          song_title:
            entry.song_title ??
            "",

          song_url:
            entry.song_url ??
            "",
        }),
      ),

    nf_date_type:
      (
        s.nf_date_type ??
        ""
      ) as DateType | "",

    nf_exact_date:
      s.nf_exact_date ??
      "",

    nf_approximate_text:
      s.nf_approximate_text ??
      "",

    nf_result_date_type:
      (
        s.nf_result_date_type ??
        ""
      ) as DateType | "",

    nf_result_exact_date:
      s.nf_result_exact_date ??
      "",

    nf_result_approximate_text:
      s.nf_result_approximate_text ??
      "",

    reveal_date_type:
      (
        s.reveal_date_type ??
        ""
      ) as DateType | "",

    reveal_exact_date:
      s.reveal_exact_date ??
      "",

    reveal_approximate_text:
      s.reveal_approximate_text ??
      "",
  };
}
