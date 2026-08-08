import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";

import {
  createEditLink,
  deleteSubmission,
  getSubmission,
  getSubmissionTechnical,
  revokeEditLink,
  setWinningEntry,
  updateSubmissionFlags,
} from "@/lib/admin.functions";
import { describeDate, statusOf, type AdminSubmission } from "@/lib/adminModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/responses/$id")({
  component: ResponseDetail,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ResponseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getSubmission);
  const updateFlags = useServerFn(updateSubmissionFlags);
  const setWinner = useServerFn(setWinningEntry);
  const remove = useServerFn(deleteSubmission);
  const getTechnical = useServerFn(getSubmissionTechnical);
const generateEditLink = useServerFn(createEditLink);
const revokeLink = useServerFn(revokeEditLink);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
const [linkType, setLinkType] = useState<"reusable" | "one_time">("reusable");

  const { data: technical } = useQuery({
  queryKey: ["submission-technical", id],
  queryFn: () => getTechnical({ data: { id } }),
});

  const submission = data?.submission as AdminSubmission | null | undefined;
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (submission) setNotes(submission.admin_notes ?? "");
  }, [submission?.id, submission?.admin_notes]);

  if (!submission) {
    return <p className="text-sm text-muted-foreground">Loading response…</p>;
  }

  async function flags(patch: Record<string, boolean | string>) {
    await updateFlags({ data: { id, ...patch } });
    qc.invalidateQueries({ queryKey: ["submission", id] });
    qc.invalidateQueries({ queryKey: ["submissions"] });
  }

  const internal = submission.internal_entries;
  const nf = submission.national_finals;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/responses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to responses
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{submission.country}</h1>
          <p className="text-sm text-muted-foreground">
            @{submission.instagram_username} · {statusOf(submission)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            if (!confirm("Delete this response permanently?")) return;
            await remove({ data: { id } });
            toast.success("Response deleted");
            navigate({ to: "/admin/responses" });
          }}
        >
          Delete response
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Delegation
          </h2>
          <Row label="Country" value={submission.country} />
          <Row label="Instagram" value={`@${submission.instagram_username}`} />
          <Row
            label="Country account"
            value={
              submission.has_country_account ? (submission.country_account ?? "Yes") : "No account"
            }
          />
          <Row label="Participating" value={submission.participating ? "Yes" : "No"} />
          <Row
            label="Selection method"
            value={(submission.selection_method ?? "—").replace("_", " ")}
          />
        </section>

        {internal ? (
          <section className="surface p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Internal selection
            </h2>
            <Row label="Artist" value={internal.artist ?? "Not known yet"} />
            <Row label="Song" value={internal.song_title ?? "Not known yet"} />
            <Row
              label="Link"
              value={
                internal.song_url ? (
                  <a
                    href={internal.song_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline"
                  >
                    Open
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label="25s preview"
              value={
                internal.preview_start ? `${internal.preview_start} – ${internal.preview_end}` : "—"
              }
            />
            <Row
              label="90s clip"
              value={
                internal.final_clip_start
                  ? `${internal.final_clip_start} – ${internal.final_clip_end}`
                  : "—"
              }
            />
            <Row
              label="Replacement video"
              value={
                internal.replacement_video_required
                  ? (internal.replacement_video_url ?? "Required")
                  : "Not needed"
              }
            />
          </section>
        ) : null}

        {nf ? (
          <section className="surface p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              National Final
            </h2>
            <Row label="Name" value={nf.nf_name ?? "—"} />
            <Row label="Expected entries" value={nf.expected_entry_count ?? "Unknown"} />
            <Row
              label="NF date"
              value={describeDate(
                submission.nf_date_type,
                submission.nf_exact_date,
                submission.nf_approximate_text,
              )}
            />
            <Row
              label="Result date"
              value={describeDate(
                submission.nf_result_date_type,
                submission.nf_result_exact_date,
                submission.nf_result_approximate_text,
              )}
            />
            <ul className="mt-4 space-y-2">
              {nf.national_final_entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                >
                  <span>
                    {e.artist} — {e.song_title}
                  </span>
                  <Button
                    size="sm"
                    variant={nf.winning_entry_id === e.id ? "default" : "outline"}
                    onClick={async () => {
                      await setWinner({
                        data: {
                          national_final_id: nf.id,
                          entry_id: nf.winning_entry_id === e.id ? null : e.id,
                        },
                      });
                      qc.invalidateQueries({ queryKey: ["submission", id] });
                    }}
                  >
                    {nf.winning_entry_id === e.id ? "Winner" : "Mark winner"}
                  </Button>
                </li>
              ))}
              {nf.national_final_entries.length === 0 ? (
                <li className="text-xs text-muted-foreground">Entries not submitted yet.</li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <section className="surface p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Release &amp; embargo
          </h2>
          <Row
            label="Reveal date"
            value={describeDate(
              submission.reveal_date_type,
              submission.reveal_exact_date,
              submission.reveal_approximate_text,
            )}
          />
          <Row label="Edits made" value={submission.edit_count} />
          <Row label="Last update" value={new Date(submission.updated_at).toLocaleString()} />
        </section>

        <section className="surface space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Admin controls
          </h2>
          <div className="flex items-center justify-between">
            <Label htmlFor="reviewed">Reviewed</Label>
            <Switch
              id="reviewed"
              checked={submission.reviewed}
              onCheckedChange={(v) => flags({ reviewed: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="editing">Allow participant to edit</Label>
            <Switch
              id="editing"
              checked={submission.editing_allowed}
              onCheckedChange={(v) => flags({ editing_allowed: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="locked">Locked</Label>
            <Switch
              id="locked"
              checked={submission.locked}
              onCheckedChange={(v) => flags({ locked: v })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button
              size="sm"
              onClick={async () => {
                await flags({ admin_notes: notes });
                toast.success("Notes saved");
              }}
            >
              Save notes
            </Button>
          </div>
        </section>

        <section className="surface space-y-4 p-5">
  <div>
    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
      Edit access
    </h2>
    <p className="mt-1 text-xs text-muted-foreground">
      Generate a private link that lets this participant edit their existing
      response.
    </p>
  </div>

  <div className="flex gap-2">
    <Button
      size="sm"
      variant={linkType === "reusable" ? "default" : "outline"}
      onClick={() => setLinkType("reusable")}
    >
      Reusable
    </Button>

    <Button
      size="sm"
      variant={linkType === "one_time" ? "default" : "outline"}
      onClick={() => setLinkType("one_time")}
    >
      One-time
    </Button>
  </div>

  <Button
    onClick={async () => {
      try {
        const result = await generateEditLink({
          data: {
            submission_id: id,
            token_type: linkType,
            expires_in_hours: null,
          },
        });

        const url = `${window.location.origin}/edit/${result.token}`;
        setGeneratedLink(url);

        await navigator.clipboard.writeText(url);

        toast.success("Edit link generated and copied");
        qc.invalidateQueries({
          queryKey: ["submission-technical", id],
        });
      } catch {
        toast.error("Could not generate edit link");
      }
    }}
  >
    <Link2 className="mr-2 size-4" />
    Generate edit link
  </Button>

  {generatedLink ? (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="break-all text-xs text-muted-foreground">
        {generatedLink}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(generatedLink);
            toast.success("Edit link copied");
          }}
        >
          <Copy className="mr-2 size-3.5" />
          Copy
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            window.open(generatedLink, "_blank", "noopener,noreferrer");
          }}
        >
          <ExternalLink className="mr-2 size-3.5" />
          Open
        </Button>
      </div>
    </div>
  ) : null}

  <div className="space-y-2">
    {(technical?.tokens ?? []).map((token) => (
      <div
        key={token.id}
        className="rounded-lg border border-border bg-secondary/20 p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {token.token_type === "one_time"
                ? "One-time link"
                : "Reusable link"}
            </p>

            <p className="text-xs text-muted-foreground">
              {token.active ? "Active" : "Revoked"} · Used {token.use_count}{" "}
              time{token.use_count === 1 ? "" : "s"}
            </p>
          </div>

          {token.active ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                await revokeLink({
                  data: { id: token.id },
                });

                toast.success("Edit link revoked");

                qc.invalidateQueries({
                  queryKey: ["submission-technical", id],
                });
              }}
            >
              <Trash2 className="mr-2 size-3.5" />
              Revoke
            </Button>
          ) : null}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          <p>
            Created: {new Date(token.created_at).toLocaleString()}
          </p>

          {token.last_used_at ? (
            <p>
              Last used: {new Date(token.last_used_at).toLocaleString()}
            </p>
          ) : null}

          {token.expires_at ? (
            <p>
              Expires: {new Date(token.expires_at).toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
    ))}

    {(technical?.tokens ?? []).length === 0 ? (
      <p className="text-xs text-muted-foreground">
        No edit links have been generated.
      </p>
    ) : null}
  </div>
</section>

        <section className="surface p-5">
  <div className="mb-4 flex items-center gap-2">
    <Shield className="size-4 text-muted-foreground" />

    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
      Technical information
    </h2>
  </div>

  <Row
    label="Initial IP"
    value={
      technical?.ip_history?.length
        ? technical.ip_history[
            technical.ip_history.length - 1
          ]?.ip_address ?? "—"
        : "—"
    }
  />

  <Row
    label="Latest IP"
    value={technical?.ip_history?.[0]?.ip_address ?? "—"}
  />

  <Row
    label="Known IP addresses"
    value={technical?.ip_history?.length ?? 0}
  />

  <div className="mt-4 space-y-2">
    {(technical?.ip_history ?? []).map((ip) => (
      <div
        key={ip.id}
        className="rounded-lg border border-border px-3 py-2 text-xs"
      >
        <p className="font-medium">{ip.ip_address}</p>

        <p className="mt-1 text-muted-foreground">
          First seen: {new Date(ip.first_seen_at).toLocaleString()}
        </p>

        <p className="text-muted-foreground">
          Last seen: {new Date(ip.last_seen_at).toLocaleString()}
        </p>
      </div>
    ))}
  </div>
</section>
        
        <section className="surface p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Edit history
          </h2>
          <ul className="space-y-2 text-sm">
            {(data?.versions ?? []).map((v: { id: string; version: number; created_at: string }) => (
              <li key={v.id} className="flex justify-between text-muted-foreground">
                <span>Version {v.version}</span>
                <span>{new Date(v.created_at).toLocaleString()}</span>
              </li>
            ))}
            {(data?.versions ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">No edits recorded.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
