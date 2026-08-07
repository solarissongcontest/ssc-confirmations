import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { deleteRound, saveRound, setRoundStatus } from "@/lib/admin.functions";
import { useEditions, useScope, useSubmissions } from "@/lib/adminHooks";
import { ScopePicker } from "@/components/admin/ScopePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/rounds")({
  component: RoundsPage,
});

const STATUSES = ["draft", "open", "closed", "auto_closed"] as const;
type Status = (typeof STATUSES)[number];

const EMPTY = {
  name: "",
  status: "draft" as Status,
  opens_at: "",
  closes_at: "",
  response_limit: "",
};

function RoundsPage() {
  const { data: editions } = useEditions();
  const scope = useScope(editions);
  const qc = useQueryClient();
  const save = useServerFn(saveRound);
  const setStatus = useServerFn(setRoundStatus);
  const remove = useServerFn(deleteRound);
  const { data: submissions } = useSubmissions(
    scope.editionId ? { edition_id: scope.editionId } : {},
  );

  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);
  const [error, setError] = useState("");

  function refresh() {
    qc.invalidateQueries({ queryKey: ["editions"] });
    qc.invalidateQueries({ queryKey: ["submissions"] });
  }

  async function submit() {
    if (!scope.editionId) return setError("Create an edition first.");
    if (!form.name.trim()) return setError("Round name is required.");
    if (form.response_limit && !/^\d+$/.test(form.response_limit))
      return setError("Response limit must be a number.");
    setError("");
    await save({
      data: {
        ...(form.id ? { id: form.id } : {}),
        edition_id: scope.editionId,
        name: form.name.trim(),
        status: form.status,
        opens_at: form.opens_at ? new Date(form.opens_at).toISOString() : null,
        closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
        response_limit: form.response_limit ? Number(form.response_limit) : null,
      },
    });
    toast.success(form.id ? "Round updated" : "Round created");
    setForm(EMPTY);
    refresh();
  }

  const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Submission rounds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open, close and limit each round. Rounds close automatically when the limit is reached.
        </p>
      </header>

      <ScopePicker scope={scope} editions={editions} showRounds={false} />

      <div className="surface space-y-4 p-5">
        <h2 className="text-sm font-semibold">{form.id ? "Edit round" : "New round"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Round name</Label>
            <Input
              value={form.name}
              placeholder="Confirmations Round 1"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Response limit (optional)</Label>
            <Input
              value={form.response_limit}
              placeholder="45"
              onChange={(e) => setForm({ ...form, response_limit: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Opens at (optional)</Label>
            <Input
              type="datetime-local"
              value={form.opens_at}
              onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Closes at (optional)</Label>
            <Input
              type="datetime-local"
              value={form.closes_at}
              onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm({ ...form, status: s })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
                form.status === s
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button onClick={submit}>{form.id ? "Save changes" : "Create round"}</Button>
          {form.id ? (
            <Button variant="ghost" onClick={() => setForm(EMPTY)}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {scope.rounds.map((r) => {
          const count = (submissions ?? []).filter((s) => s.round_id === r.id).length;
          return (
            <div key={r.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {r.status.replace("_", " ")} · {count}
                    {r.response_limit ? ` / ${r.response_limit}` : ""} responses
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.opens_at ? `Opens ${new Date(r.opens_at).toLocaleString()}` : "No open date"}{" "}
                    ·{" "}
                    {r.closes_at
                      ? `Closes ${new Date(r.closes_at).toLocaleString()}`
                      : "No close date"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["open", "closed", "draft"] as Status[]).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={r.status === s ? "default" : "outline"}
                      onClick={async () => {
                        await setStatus({ data: { id: r.id, status: s } });
                        refresh();
                        toast.success(`Round ${s}`);
                      }}
                    >
                      {s === "open" ? "Open" : s === "closed" ? "Close" : "Draft"}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        id: r.id,
                        name: r.name,
                        status: r.status as Status,
                        opens_at: toLocal(r.opens_at),
                        closes_at: toLocal(r.closes_at),
                        response_limit: r.response_limit ? String(r.response_limit) : "",
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`Delete ${r.name} and all its responses?`)) return;
                      await remove({ data: { id: r.id } });
                      refresh();
                      toast.success("Round deleted");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {scope.rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rounds in this edition yet.</p>
        ) : null}
      </div>
    </div>
  );
}
