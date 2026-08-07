import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import {
  deleteSubmission,
  getSubmission,
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

  const { data } = useQuery({
    queryKey: ["submission", id],
    queryFn: () => get({ data: { id } }),
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
