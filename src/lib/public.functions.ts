import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AvailabilityReason, RoundAvailability } from "@/lib/ssc";

const payloadSchema = z.object({
  round_id: z.string().uuid(),
  instagram_username: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  has_country_account: z.boolean(),
  country_account: z.string().trim().max(80),
  participating: z.boolean(),
  selection_method: z.enum(["internal", "national_final", "unknown", ""]),
  entry_unknown: z.boolean(),
  nf_entries_unknown: z.boolean(),
  artist: z.string().trim().max(160),
  song_title: z.string().trim().max(160),
  song_url: z.string().trim().max(500),
  preview_start: z.string().trim().max(10),
  preview_end: z.string().trim().max(10),
  final_clip_start: z.string().trim().max(10),
  final_clip_end: z.string().trim().max(10),
  replacement_video_required: z.boolean(),
  replacement_video_url: z.string().trim().max(500),
  nf_name: z.string().trim().max(160),
  expected_entry_count: z.string().trim().max(4),
  nf_entries: z
    .array(
      z.object({
        artist: z.string().trim().max(160),
        song_title: z.string().trim().max(160),
        song_url: z.string().trim().max(500),
      }),
    )
    .max(60),
  nf_date_type: z.string().max(20),
  nf_exact_date: z.string().max(20),
  nf_approximate_text: z.string().trim().max(200),
  nf_result_date_type: z.string().max(20),
  nf_result_exact_date: z.string().max(20),
  nf_result_approximate_text: z.string().trim().max(200),
  reveal_date_type: z.string().max(20),
  reveal_exact_date: z.string().max(20),
  reveal_approximate_text: z.string().trim().max(200),
  browser_session_id: z.string().trim().max(80).optional(),
  edit_token: z.string().trim().max(120).optional(),
});

export interface PublicRound {
  id: string;
  name: string;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  response_limit: number | null;
  response_count: number;
  edition_id: string;
  edition_name: string;
  edition_number: number;
}

export const getPublicRounds = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicRound[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: editions } = await supabaseAdmin
      .from("editions")
      .select("id, name, edition_number, status")
      .eq("status", "active")
      .order("edition_number", { ascending: false });

    if (!editions || editions.length === 0) return [] as PublicRound[];
    const editionIds = editions.map((e) => e.id);

    const { data: rounds } = await supabaseAdmin
      .from("submission_rounds")
      .select("id, edition_id, name, status, opens_at, closes_at, response_limit, created_at")
      .in("edition_id", editionIds)
      .neq("status", "draft")
      .order("created_at", { ascending: true });

    const { data: counts } = await supabaseAdmin.from("submissions").select("round_id");

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.round_id, (countMap.get(row.round_id) ?? 0) + 1);
    }

    return (rounds ?? []).map((r) => {
      const edition = editions.find((e) => e.id === r.edition_id)!;
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        opens_at: r.opens_at,
        closes_at: r.closes_at,
        response_limit: r.response_limit,
        response_count: countMap.get(r.id) ?? 0,
        edition_id: r.edition_id,
        edition_name: edition.name,
        edition_number: edition.edition_number,
      } satisfies PublicRound;
    });
  },
);

/** Authoritative availability check — same rule the submit path enforces. */
export const getRoundAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: { round_id: string }) =>
    z.object({ round_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<RoundAvailability> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result } = await supabaseAdmin.rpc("round_availability", {
      _round_id: data.round_id,
    });
    return result as unknown as RoundAvailability;
  });

export const submitConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getClientIp, sha256Hex } = await import("@/lib/request.server");

    const { edit_token, ...rest } = data;
    const payload: Record<string, unknown> = {
      ...rest,
      client_ip: getClientIp(),
      ...(edit_token ? { edit_token_hash: await sha256Hex(edit_token) } : {}),
    };

    const { data: result, error } = await supabaseAdmin.rpc("submit_confirmation", {
      payload: payload as never,
    });
    if (error) return { ok: false as const, error: "server" };
    return result as unknown as {
      ok: boolean;
      error?: string;
      reason?: AvailabilityReason;
      submission_id?: string;
    };
  });

/** Look up an existing submission for the identity, for duplicate detection / admin-enabled editing. */
export const lookupSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: { round_id: string; country: string }) =>
    z.object({ round_id: z.string().uuid(), country: z.string().trim().min(1).max(80) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("submissions")
      .select(
        "id, editing_allowed, locked, instagram_username, country, country_account, has_country_account, participating, selection_method, entry_unknown, nf_entries_unknown, reveal_date_type, reveal_exact_date, reveal_approximate_text, nf_date_type, nf_exact_date, nf_approximate_text, nf_result_date_type, nf_result_exact_date, nf_result_approximate_text, internal_entries(*), national_finals(*, national_final_entries(*))",
      )
      .eq("round_id", data.round_id)
      .ilike("country", data.country.trim());

    const existing = rows?.[0];
    if (!existing) return { exists: false as const };
    if (!existing.editing_allowed || existing.locked) {
      return { exists: true as const, canEdit: false as const };
    }
    return { exists: true as const, canEdit: true as const, submission: existing };
  });

/* --------------------------------- drafts --------------------------------- */

const draftSchema = z.object({
  round_id: z.string().uuid(),
  browser_session_id: z.string().trim().min(1).max(80),
  /** JSON-encoded ConfirmationPayload plus the current step. */
  payload_json: z.string().max(200_000),
});

export const saveDraft = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => draftSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getClientIp } = await import("@/lib/request.server");
    const ip = getClientIp();
    let p: Record<string, unknown> = {};
    try {
      p = JSON.parse(data.payload_json) as Record<string, unknown>;
    } catch {
      return { ok: false as const, saved_at: "" };
    }
    const form = (p['payload'] ?? p) as Record<string, unknown>;

    const { data: existing } = await supabaseAdmin
      .from("submission_drafts")
      .select("id, initial_ip")
      .eq("round_id", data.round_id)
      .eq("browser_session_id", data.browser_session_id)
      .maybeSingle();

    const row = {
      round_id: data.round_id,
      browser_session_id: data.browser_session_id,
      payload: p as never,
      instagram_username:
        typeof form['instagram_username'] === "string" ? (form['instagram_username'] as string) : null,
      country: typeof form['country'] === "string" ? (form['country'] as string) : null,
      latest_ip: ip,
      initial_ip: existing?.initial_ip ?? ip,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin.from("submission_drafts").update(row).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("submission_drafts").insert(row);
    }
    return { ok: true as const, saved_at: row.updated_at };
  });

export const loadDraft = createServerFn({ method: "POST" })
  .inputValidator((data: { round_id: string; browser_session_id: string }) =>
    z
      .object({
        round_id: z.string().uuid(),
        browser_session_id: z.string().trim().min(1).max(80),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("submission_drafts")
      .select("payload, updated_at, submitted_submission_id")
      .eq("round_id", data.round_id)
      .eq("browser_session_id", data.browser_session_id)
      .maybeSingle();
    if (!row || row.submitted_submission_id) return { found: false as const, payload_json: "" };
    return {
      found: true as const,
      payload_json: JSON.stringify(row.payload),
      updated_at: row.updated_at,
    };
  });

/** Find a submission previously sent from this browser, for "you already responded". */
export const findMySubmission = createServerFn({ method: "POST" })
  .inputValidator((data: { round_id: string; browser_session_id: string }) =>
    z
      .object({
        round_id: z.string().uuid(),
        browser_session_id: z.string().trim().min(1).max(80),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("submissions")
      .select("id, country, instagram_username, submitted_at, editing_allowed, locked")
      .eq("round_id", data.round_id)
      .eq("browser_session_id", data.browser_session_id)
      .maybeSingle();
    if (!row) return { found: false as const };
    return { found: true as const, submission: row };
  });

/* ------------------------------- edit links ------------------------------- */

const EDIT_SELECT =
  "id, round_id, editing_allowed, locked, instagram_username, country, country_account, has_country_account, participating, selection_method, entry_unknown, nf_entries_unknown, reveal_date_type, reveal_exact_date, reveal_approximate_text, nf_date_type, nf_exact_date, nf_approximate_text, nf_result_date_type, nf_result_exact_date, nf_result_approximate_text, internal_entries(*), national_finals(*, national_final_entries(*))";

export const resolveEditToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) =>
    z.object({ token: z.string().trim().min(10).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sha256Hex } = await import("@/lib/request.server");
    const hash = await sha256Hex(data.token);

    const { data: tok } = await supabaseAdmin
      .from("edit_tokens")
      .select("id, submission_id, active, expires_at, token_type")
      .eq("token_hash", hash)
      .maybeSingle();

    if (!tok || !tok.active) return { valid: false as const, reason: "invalid" as const };
    if (tok.expires_at && new Date(tok.expires_at) <= new Date())
      return { valid: false as const, reason: "expired" as const };

    const { data: submission } = await supabaseAdmin
      .from("submissions")
      .select(EDIT_SELECT)
      .eq("id", tok.submission_id)
      .maybeSingle();
    if (!submission) return { valid: false as const, reason: "invalid" as const };
    if (submission.locked) return { valid: false as const, reason: "locked" as const };

    const { data: round } = await supabaseAdmin
      .from("submission_rounds")
      .select("id, name, status, opens_at, closes_at, response_limit, edition_id")
      .eq("id", submission.round_id)
      .maybeSingle();
    const { data: edition } = round
      ? await supabaseAdmin
          .from("editions")
          .select("id, name, edition_number")
          .eq("id", round.edition_id)
          .maybeSingle()
      : { data: null };

    const publicRound: PublicRound | null =
      round && edition
        ? {
            id: round.id,
            name: round.name,
            status: round.status,
            opens_at: round.opens_at,
            closes_at: round.closes_at,
            response_limit: round.response_limit,
            response_count: 0,
            edition_id: edition.id,
            edition_name: edition.name,
            edition_number: edition.edition_number,
          }
        : null;

    return { valid: true as const, submission, round: publicRound };
  });
