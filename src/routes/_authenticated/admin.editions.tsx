import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { deleteEdition, saveEdition } from "@/lib/admin.functions";
import { useEditions, type AdminEdition } from "@/lib/adminHooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/editions")({
  component: EditionsPage,
});

const STATUSES = ["draft", "active", "finished"] as const;

function EditionsPage() {
  const { data: editions } = useEditions();
  const qc = useQueryClient();
  const save = useServerFn(saveEdition);
  const remove = useServerFn(deleteEdition);

  const [form, setForm] = useState<{
    id?: string;
    name: string;
    edition_number: string;
    description: string;
    status: (typeof STATUSES)[number];
  }>({ name: "", edition_number: "", description: "", status: "draft" });
  const [error, setError] = useState("");

  async function submit() {
    if (!form.name.trim()) return setError("Edition name is required.");
    if (!/^\d+$/.test(form.edition_number)) return setError("Edition number must be a number.");
    setError("");
    await save({
      data: {
        ...(form.id ? { id: form.id } : {}),
        name: form.name.trim(),
        edition_number: Number(form.edition_number),
        description: form.description.trim(),
        status: form.status,
      },
    });
    toast.success(form.id ? "Edition updated" : "Edition created");
    setForm({ name: "", edition_number: "", description: "", status: "draft" });
    qc.invalidateQueries({ queryKey: ["editions"] });
  }

  function edit(e: AdminEdition) {
    setForm({
      id: e.id,
      name: e.name,
      edition_number: String(e.edition_number),
      description: e.description ?? "",
      status: e.status as (typeof STATUSES)[number],
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Editions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every contest edition and the rounds inside it.
        </p>
      </header>

      <div className="surface space-y-4 p-5">
        <h2 className="text-sm font-semibold">{form.id ? "Edit edition" : "New edition"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Edition name</Label>
            <Input
              value={form.name}
              placeholder="SSC 22"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Edition number</Label>
            <Input
              value={form.edition_number}
              placeholder="22"
              onChange={(e) => setForm({ ...form, edition_number: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex gap-2">
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
                {s}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button onClick={submit}>
            <Plus className="size-4" /> {form.id ? "Save changes" : "Create edition"}
          </Button>
          {form.id ? (
            <Button
              variant="ghost"
              onClick={() =>
                setForm({ name: "", edition_number: "", description: "", status: "draft" })
              }
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {(editions ?? []).map((e) => (
          <div key={e.id} className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{e.name}</h3>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  #{e.edition_number} · {e.status}
                </p>
                {e.description ? (
                  <p className="mt-2 max-w-prose text-sm text-muted-foreground">{e.description}</p>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => edit(e)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm(`Delete ${e.name} and all its rounds and responses?`)) return;
                    await remove({ data: { id: e.id } });
                    qc.invalidateQueries({ queryKey: ["editions"] });
                    toast.success("Edition deleted");
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {e.submission_rounds.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                >
                  <span>{r.name}</span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {r.status.replace("_", " ")}
                  </span>
                </li>
              ))}
              {e.submission_rounds.length === 0 ? (
                <li className="text-xs text-muted-foreground">No rounds yet.</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
