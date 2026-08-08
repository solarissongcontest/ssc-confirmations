import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) === 0) {
    // Bootstrap: the first signed-in user becomes the contest administrator.
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    return supabaseAdmin;
  }

  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!data) throw new Error("Forbidden");
  return supabaseAdmin;
}

export const checkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertAdmin(context.userId);
      return { isAdmin: true };
    } catch {
      return { isAdmin: false };
    }
  });

/* ------------------------------- editions -------------------------------- */

export const listEditions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.userId);
    await db
  .from("edit_tokens")
  .update({ active: false })
  .eq("submission_id", data.submission_id)
  .eq("active", true);
    const { data } = await db
      .from("editions")
      .select("*, submission_rounds(*)")
      .order("edition_number", { ascending: false });
    return data ?? [];
  });

export const saveEdition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(80),
        edition_number: z.number().int().min(0).max(999),
        description: z.string().trim().max(500).optional(),
        status: z.enum(["draft", "active", "finished"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const row = {
      name: data.name,
      edition_number: data.edition_number,
      description: data.description ?? null,
      status: data.status,
    };
    if (data.id) {
      await db.from("editions").update(row).eq("id", data.id);
      return { ok: true };
    }
    await db.from("editions").insert(row);
    return { ok: true };
  });

export const deleteEdition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db.from("editions").delete().eq("id", data.id);
    return { ok: true };
  });

/* --------------------------------- rounds -------------------------------- */

export const saveRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        edition_id: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        status: z.enum(["draft", "open", "closed", "auto_closed"]),
        opens_at: z.string().nullable(),
        closes_at: z.string().nullable(),
        response_limit: z.number().int().min(1).max(1000).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const row = {
      edition_id: data.edition_id,
      name: data.name,
      status: data.status,
      opens_at: data.opens_at,
      closes_at: data.closes_at,
      response_limit: data.response_limit,
    };
    if (data.id) {
      await db.from("submission_rounds").update(row).eq("id", data.id);
      return { ok: true };
    }
    await db.from("submission_rounds").insert(row);
    return { ok: true };
  });

export const setRoundStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "open", "closed", "auto_closed"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db.from("submission_rounds").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });

export const deleteRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db.from("submission_rounds").delete().eq("id", data.id);
    return { ok: true };
  });

/* ------------------------------ submissions ------------------------------ */

const SUBMISSION_SELECT =
  "*, internal_entries(*), national_finals(*, national_final_entries(*)), submission_rounds(id, name, edition_id), editions(id, name, edition_number)";

export const listSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        edition_id: z.string().uuid().optional(),
        round_id: z.string().uuid().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    let query = db.from("submissions").select(SUBMISSION_SELECT);
    if (data.edition_id) query = query.eq("edition_id", data.edition_id);
    if (data.round_id) query = query.eq("round_id", data.round_id);
    const { data: rows } = await query.order("submitted_at", { ascending: false });
    return rows ?? [];
  });

export const getSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { data: row } = await db
      .from("submissions")
      .select(SUBMISSION_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    const { data: versions } = await db
      .from("submission_versions")
      .select("*")
      .eq("submission_id", data.id)
      .order("version", { ascending: false });
    return { submission: row, versions: versions ?? [] };
  });

export const updateSubmissionFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        editing_allowed: z.boolean().optional(),
        locked: z.boolean().optional(),
        reviewed: z.boolean().optional(),
        admin_notes: z.string().max(4000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { data: current } = await db
      .from("submissions")
      .select("editing_allowed, locked, reviewed, admin_notes")
      .eq("id", data.id)
      .maybeSingle();
    await db
      .from("submissions")
      .update({
        editing_allowed: data.editing_allowed ?? current?.editing_allowed ?? false,
        locked: data.locked ?? current?.locked ?? false,
        reviewed: data.reviewed ?? current?.reviewed ?? false,
        admin_notes: data.admin_notes ?? current?.admin_notes ?? null,
      })
      .eq("id", data.id);
    return { ok: true };
  });

export const setWinningEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ national_final_id: z.string().uuid(), entry_id: z.string().uuid().nullable() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db
      .from("national_finals")
      .update({ winning_entry_id: data.entry_id })
      .eq("id", data.national_final_id);
    return { ok: true };
  });

export const deleteSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db.from("submissions").delete().eq("id", data.id);
    return { ok: true };
  });

/* --------------------------------- drafts --------------------------------- */

export const listDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ round_id: z.string().uuid().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    let query = db
      .from("submission_drafts")
      .select("id, round_id, browser_session_id, instagram_username, country, initial_ip, latest_ip, created_at, updated_at, submitted_submission_id")
      .is("submitted_submission_id", null);
    if (data.round_id) query = query.eq("round_id", data.round_id);
    const { data: rows } = await query.order("updated_at", { ascending: false });
    return rows ?? [];
  });

export const deleteDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db.from("submission_drafts").delete().eq("id", data.id);
    return { ok: true };
  });

/* ----------------------------- technical info ----------------------------- */

export const getSubmissionTechnical = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { data: history } = await db
      .from("submission_ip_history")
      .select("id, ip_address, first_seen_at, last_seen_at")
      .eq("submission_id", data.id)
      .order("last_seen_at", { ascending: false });
    const { data: tokens } = await db
      .from("edit_tokens")
      .select("id, token_type, active, created_at, expires_at, last_used_at, use_count")
      .eq("submission_id", data.id)
      .order("created_at", { ascending: false });
    return { ip_history: history ?? [], tokens: tokens ?? [] };
  });

/* ------------------------------- edit links ------------------------------- */

export const createEditLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        submission_id: z.string().uuid(),
        token_type: z.enum(["one_time", "reusable"]),
        expires_in_hours: z.number().int().min(1).max(8760).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { sha256Hex } = await import("@/lib/request.server");
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await db.from("edit_tokens").insert({
      submission_id: data.submission_id,
      token_hash: await sha256Hex(token),
      token_type: data.token_type,
      expires_at: data.expires_in_hours
        ? new Date(Date.now() + data.expires_in_hours * 3600_000).toISOString()
        : null,
    });
    // Returned exactly once — only the hash is stored.
    return { token };
  });

export const revokeEditLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    await db.from("edit_tokens").update({ active: false }).eq("id", data.id);
    return { ok: true };
  });

/* --------------------------- availability testing -------------------------- */

export const testRoundAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { round_id: string }) =>
    z.object({ round_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { data: result } = await db.rpc("round_availability", { _round_id: data.round_id });
    return result as unknown as {
      can_accept: boolean;
      reason: string;
      count: number;
      limit: number | null;
      remaining: number | null;
      status: string | null;
      opens_at: string | null;
      closes_at: string | null;
      server_time: string;
    };
  });
