import type { ConfirmationPayload, DateType } from "@/lib/ssc";

/** Map a stored submission row onto the form payload shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prefillFromSubmission(s: any, base: ConfirmationPayload): ConfirmationPayload {
  const internal = s.internal_entries;
  const nf = s.national_finals;
  return {
    ...base,
    instagram_username: s.instagram_username ?? base.instagram_username,
    country: s.country ?? base.country,
    country_account: s.country_account ?? "",
    has_country_account: s.has_country_account ?? false,
    participating: s.participating ?? true,
    selection_method: (s.selection_method ?? "") as ConfirmationPayload["selection_method"],
    entry_unknown: s.entry_unknown ?? false,
    nf_entries_unknown: s.nf_entries_unknown ?? false,
    artist: internal?.artist ?? "",
    song_title: internal?.song_title ?? "",
    song_url: internal?.song_url ?? "",
    preview_start: internal?.preview_start ?? "",
    preview_end: internal?.preview_end ?? "",
    final_clip_start: internal?.final_clip_start ?? "",
    final_clip_end: internal?.final_clip_end ?? "",
    replacement_video_required: internal?.replacement_video_required ?? false,
    replacement_video_url: internal?.replacement_video_url ?? "",
    nf_name: nf?.nf_name ?? "",
    expected_entry_count: nf?.expected_entry_count ? String(nf.expected_entry_count) : "",
    nf_entries: (nf?.national_final_entries ?? [])
      .slice()
      .sort((a: { position: number }, b: { position: number }) => (a.position ?? 0) - (b.position ?? 0))
      .map((entry: { artist: string | null; song_title: string | null; song_url: string | null }) => ({
        artist: entry.artist ?? "",
        song_title: entry.song_title ?? "",
        song_url: entry.song_url ?? "",
      })),
    nf_date_type: (s.nf_date_type ?? "") as DateType | "",
    nf_exact_date: s.nf_exact_date ?? "",
    nf_approximate_text: s.nf_approximate_text ?? "",
    nf_result_date_type: (s.nf_result_date_type ?? "") as DateType | "",
    nf_result_exact_date: s.nf_result_exact_date ?? "",
    nf_result_approximate_text: s.nf_result_approximate_text ?? "",
    reveal_date_type: (s.reveal_date_type ?? "") as DateType | "",
    reveal_exact_date: s.reveal_exact_date ?? "",
    reveal_approximate_text: s.reveal_approximate_text ?? "",
  };
}
