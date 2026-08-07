import { computeEntryStatus, type EntryStatus } from "@/lib/ssc";

export interface AdminSubmission {
  id: string;
  country: string;
  instagram_username: string;
  country_account: string | null;
  has_country_account: boolean;
  participating: boolean;
  selection_method: string | null;
  entry_unknown: boolean;
  nf_entries_unknown: boolean;
  reveal_date_type: string | null;
  reveal_exact_date: string | null;
  reveal_approximate_text: string | null;
  nf_date_type: string | null;
  nf_exact_date: string | null;
  nf_approximate_text: string | null;
  nf_result_date_type: string | null;
  nf_result_exact_date: string | null;
  nf_result_approximate_text: string | null;
  editing_allowed: boolean;
  locked: boolean;
  reviewed: boolean;
  admin_notes: string | null;
  edit_count: number;
  submitted_at: string;
  updated_at: string;
  edition_id: string;
  round_id: string;
  internal_entries: {
    artist: string | null;
    song_title: string | null;
    song_url: string | null;
    preview_start: string | null;
    preview_end: string | null;
    final_clip_start: string | null;
    final_clip_end: string | null;
    replacement_video_required: boolean;
    replacement_video_url: string | null;
  } | null;
  national_finals: {
    id: string;
    nf_name: string | null;
    expected_entry_count: number | null;
    winning_entry_id: string | null;
    national_final_entries: {
      id: string;
      artist: string | null;
      song_title: string | null;
      song_url: string | null;
      position: number;
    }[];
  } | null;
  submission_rounds?: { id: string; name: string; edition_id: string } | null;
  editions?: { id: string; name: string; edition_number: number } | null;
}

export function revealKnown(s: AdminSubmission): boolean {
  return (
    s.reveal_date_type === "exact" ||
    s.reveal_date_type === "immediately" ||
    (s.reveal_date_type === "approximate" && !!s.reveal_approximate_text)
  );
}

export function statusOf(s: AdminSubmission): EntryStatus {
  return computeEntryStatus({
    participating: s.participating,
    selection_method: s.selection_method,
    entry_unknown: s.entry_unknown,
    nf_entries_unknown: s.nf_entries_unknown,
    hasInternalSong: !!s.internal_entries?.song_title,
    nfEntryCount: s.national_finals?.national_final_entries.length ?? 0,
    winningEntryId: s.national_finals?.winning_entry_id ?? null,
    revealKnown: revealKnown(s),
  });
}

export function describeDate(
  type: string | null,
  exact: string | null,
  approx: string | null,
): string {
  if (type === "exact") return exact ?? "—";
  if (type === "approximate") return approx ?? "—";
  if (type === "immediately") return "Immediately";
  if (type === "unknown") return "Not known yet";
  return "—";
}

export function songSubmitted(s: AdminSubmission): boolean {
  if (!s.participating) return false;
  if (s.selection_method === "internal") return !!s.internal_entries?.song_title;
  if (s.selection_method === "national_final")
    return (s.national_finals?.national_final_entries.length ?? 0) > 0;
  return false;
}
