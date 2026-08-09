import {
  computeEntryStatus,
  type EntryStatus,
} from "@/lib/ssc";

export type EntryReviewStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "removed";

export interface AdminSubmission {
  id: string;

  country: string;

  instagram_username:
    string;

  country_account:
    | string
    | null;

  has_country_account:
    boolean;

  participating:
    boolean;

  selection_method:
    | string
    | null;

  entry_unknown:
    boolean;

  nf_entries_unknown:
    boolean;

  reveal_date_type:
    | string
    | null;

  reveal_exact_date:
    | string
    | null;

  reveal_approximate_text:
    | string
    | null;

  nf_date_type:
    | string
    | null;

  nf_exact_date:
    | string
    | null;

  nf_approximate_text:
    | string
    | null;

  nf_result_date_type:
    | string
    | null;

  nf_result_exact_date:
    | string
    | null;

  nf_result_approximate_text:
    | string
    | null;

  editing_allowed:
    boolean;

  locked:
    boolean;

  reviewed:
    boolean;

  admin_notes:
    | string
    | null;

  edit_count:
    number;

  submitted_at:
    string;

  updated_at:
    string;

  edition_id:
    string;

  round_id:
    string;

  internal_entries: {
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

    preview_start:
      | string
      | null;

    preview_end:
      | string
      | null;

    final_clip_start:
      | string
      | null;

    final_clip_end:
      | string
      | null;

    replacement_video_required:
      boolean;

    replacement_video_url:
      | string
      | null;

    review_status:
      EntryReviewStatus;

    review_reason:
      | string
      | null;

    reviewed_at:
      | string
      | null;

    reviewed_by:
      | string
      | null;
  } | null;

  national_finals: {
    id: string;

    nf_name:
      | string
      | null;

    expected_entry_count:
      | number
      | null;

    winning_entry_id:
      | string
      | null;

    national_final_entries: {
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

      review_status:
        EntryReviewStatus;

      review_reason:
        | string
        | null;

      reviewed_at:
        | string
        | null;

      reviewed_by:
        | string
        | null;

      removed:
        boolean;

      removed_at:
        | string
        | null;
    }[];
  } | null;

  submission_rounds?: {
    id: string;

    name: string;

    edition_id:
      string;
  } | null;

  editions?: {
    id: string;

    name: string;

    edition_number:
      number;
  } | null;
}

export function revealKnown(
  submission:
    AdminSubmission,
) {
  return (
    submission.reveal_date_type ===
      "exact" ||
    submission.reveal_date_type ===
      "immediately" ||
    (
      submission.reveal_date_type ===
        "approximate" &&
      !!submission.reveal_approximate_text
    )
  );
}

export function statusOf(
  submission:
    AdminSubmission,
): EntryStatus {
  return computeEntryStatus({
    participating:
      submission.participating,

    selection_method:
      submission.selection_method,

    entry_unknown:
      submission.entry_unknown,

    nf_entries_unknown:
      submission.nf_entries_unknown,

    hasInternalSong:
      !!submission
        .internal_entries
        ?.song_title,

    nfEntryCount:
      submission
        .national_finals
        ?.national_final_entries
        .filter(
          (
            entry,
          ) =>
            !entry.removed,
        ).length ??
      0,

    winningEntryId:
      submission
        .national_finals
        ?.winning_entry_id ??
      null,

    revealKnown:
      revealKnown(
        submission,
      ),
  });
}

export function describeDate(
  type:
    | string
    | null,

  exact:
    | string
    | null,

  approximate:
    | string
    | null,
) {
  if (
    type ===
    "exact"
  ) {
    return exact ??
      "—";
  }

  if (
    type ===
    "approximate"
  ) {
    return approximate ??
      "—";
  }

  if (
    type ===
    "immediately"
  ) {
    return "Immediately";
  }

  if (
    type ===
    "unknown"
  ) {
    return "Not known yet";
  }

  return "—";
}

export function songSubmitted(
  submission:
    AdminSubmission,
) {
  if (
    !submission.participating
  ) {
    return false;
  }

  if (
    submission.selection_method ===
    "internal"
  ) {
    return !!submission
      .internal_entries
      ?.song_title;
  }

  if (
    submission.selection_method ===
    "national_final"
  ) {
    return (
      submission
        .national_finals
        ?.national_final_entries
        .filter(
          (
            entry,
          ) =>
            !entry.removed,
        ).length ??
      0
    ) > 0;
  }

  return false;
}
