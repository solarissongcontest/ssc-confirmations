import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GripVertical, Plus, Trash2, ArrowLeft, ArrowRight, Check, CloudUpload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  findMySubmission,
  getRoundAvailability,
  loadDraft,
  lookupSubmission,
  saveDraft,
  submitConfirmation,
  type PublicRound,
} from "@/lib/public.functions";
import { prefillFromSubmission } from "@/lib/prefill";
import {
  clearLocalDraft,
  getBrowserSessionId,
  readLocalDraft,
  writeLocalDraft,
} from "@/lib/session";
import {
  availabilityMessage,
  emptyPayload,
  isValidUrl,
  offsetTimestamp,
  parseTimestamp,
  type AvailabilityReason,
  type ConfirmationPayload,
  type DateType,
} from "@/lib/ssc";


const STEPS = ["Delegation", "Participation", "Selection", "Entry", "Release", "Review"] as const;

type Errors = Record<string, string>;

function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

function Choice({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (v: string) => void;
  columns?: number;
}) {
  return (
    <div className={cn("grid gap-2", columns === 1 ? "grid-cols-1" : "sm:grid-cols-2")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-4 py-3 text-left text-sm transition-all",
            value === o.value
              ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_var(--color-primary)]"
              : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          <span className="block font-medium text-foreground">{o.label}</span>
          {o.description ? <span className="mt-0.5 block text-xs">{o.description}</span> : null}
        </button>
      ))}
    </div>
  );
}

function DateChoice({
  value,
  onChange,
  exact,
  onExact,
  approx,
  onApprox,
  allowImmediate,
  errors,
  prefix,
  approxPlaceholder,
}: {
  value: string;
  onChange: (v: DateType) => void;
  exact: string;
  onExact: (v: string) => void;
  approx: string;
  onApprox: (v: string) => void;
  allowImmediate?: boolean;
  errors: Errors;
  prefix: string;
  approxPlaceholder: string;
}) {
  const options = [
    { value: "exact", label: "Select exact date" },
    { value: "approximate", label: "Approximate date" },
    ...(allowImmediate ? [{ value: "immediately", label: "Can be revealed immediately" }] : []),
    { value: "unknown", label: "I don't know yet" },
  ];
  return (
    <div className="space-y-3">
      <Choice options={options} value={value} onChange={(v) => onChange(v as DateType)} />
      {value === "exact" ? (
        <Input type="date" value={exact} onChange={(e) => onExact(e.target.value)} />
      ) : null}
      {value === "approximate" ? (
        <Input
          value={approx}
          onChange={(e) => onApprox(e.target.value)}
          placeholder={approxPlaceholder}
        />
      ) : null}
      {errors[prefix] ? (
        <p className="text-xs font-medium text-destructive">{errors[prefix]}</p>
      ) : null}
    </div>
  );
}

export interface ConfirmationFormProps {
  round: PublicRound;
  /** Secure edit link token — bypasses duplicate checks and targets one submission. */
  editToken?: string;
  /** Pre-filled submission when arriving through an edit link. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prefill?: any;
  /** Live availability reason from the parent page (realtime). */
  availability?: AvailabilityReason;
}

export function ConfirmationForm({
  round,
  editToken,
  prefill,
  availability,
}: ConfirmationFormProps) {
  const submit = useServerFn(submitConfirmation);
  const lookup = useServerFn(lookupSubmission);
  const persistDraft = useServerFn(saveDraft);
  const fetchDraft = useServerFn(loadDraft);
  const findMine = useServerFn(findMySubmission);
  const checkAvailability = useServerFn(getRoundAvailability);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<ConfirmationPayload>(() =>
    prefill ? prefillFromSubmission(prefill, emptyPayload(round.id)) : emptyPayload(round.id),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "submitted" | "not_participating">(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [editingExisting, setEditingExisting] = useState(Boolean(prefill));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState<string | null>(null);
  const [alreadyResponded, setAlreadyResponded] = useState<{
    country: string;
    submitted_at: string;
  } | null>(null);

  const sessionId = useMemo(() => getBrowserSessionId(), []);
  const hydrated = useRef(false);
  const dirty = useRef(false);

  const set = <K extends keyof ConfirmationPayload>(key: K, value: ConfirmationPayload[K]) => {
    dirty.current = true;
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  /* ------------------------- recovery on first mount ------------------------ */
  useEffect(() => {
    if (hydrated.current || editToken) {
      hydrated.current = true;
      return;
    }
    hydrated.current = true;
    let cancelled = false;

    (async () => {
      // 1. instant local restore (survives refresh, crash, offline)
      const local = readLocalDraft<ConfirmationPayload>(round.id);
      if (local?.payload) {
        setData({ ...local.payload, round_id: round.id });
        setStep(Math.min(local.step ?? 0, STEPS.length - 1));
        setRestored(local.savedAt);
      }

      if (!sessionId) return;

      // 2. server-side draft (survives a different tab / cleared tab state)
      try {
        const remote = await fetchDraft({
          data: { round_id: round.id, browser_session_id: sessionId },
        });
        if (!cancelled && remote.found && remote.payload_json) {
          const parsed = JSON.parse(remote.payload_json) as {
            payload?: ConfirmationPayload;
            step?: number;
          };
          const remoteAt = new Date(remote.updated_at).getTime();
          const localAt = local ? new Date(local.savedAt).getTime() : 0;
          if (parsed.payload && remoteAt > localAt) {
            setData({ ...parsed.payload, round_id: round.id });
            setStep(Math.min(parsed.step ?? 0, STEPS.length - 1));
            setRestored(remote.updated_at);
          }
        }
      } catch {
        /* offline — local draft already applied */
      }

      // 3. an existing submission from this browser
      try {
        const mine = await findMine({
          data: { round_id: round.id, browser_session_id: sessionId },
        });
        if (!cancelled && mine.found && mine.submission) {
          setAlreadyResponded({
            country: mine.submission.country,
            submitted_at: mine.submission.submitted_at,
          });
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  /* -------------------------------- autosave -------------------------------- */
  const autosave = useCallback(
    async (payload: ConfirmationPayload, currentStep: number) => {
      writeLocalDraft(round.id, payload, currentStep);
      if (!sessionId || editToken) return;
      setSaving(true);
      try {
        const res = await persistDraft({
          data: {
            round_id: round.id,
            browser_session_id: sessionId,
            payload_json: JSON.stringify({ payload, step: currentStep }),
          },
        });
        if (res.ok) setSavedAt(res.saved_at);
      } catch {
        /* keep the local copy; retry on the next change */
      } finally {
        setSaving(false);
      }
    },
    [round.id, sessionId, editToken, persistDraft],
  );

  useEffect(() => {
    if (!hydrated.current || !dirty.current || done) return;
    const t = setTimeout(() => void autosave(data, step), 1200);
    return () => clearTimeout(t);
  }, [data, step, done, autosave]);

  // flush before the tab closes
  useEffect(() => {
    const handler = () => {
      if (dirty.current && !done) writeLocalDraft(round.id, data, step);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [data, step, done, round.id]);

  const liveClosed = availability && availability !== "OPEN" && !editToken;

  const visibleSteps = useMemo(() => {
    if (!data.participating) return ["Delegation", "Participation"];
    return STEPS as unknown as string[];
  }, [data.participating]);

  const previewEnd = offsetTimestamp(data.preview_start, 25);
  const clipEnd = offsetTimestamp(data.final_clip_start, 90);


  function validate(current: number): boolean {
    const e: Errors = {};
    if (current === 0) {
      if (!data.instagram_username.trim()) e['instagram_username'] = "Instagram username is required.";
      if (!data.country.trim()) e['country'] = "Country is required.";
      if (data.has_country_account && !data.country_account.trim())
        e['country_account'] = "Add the delegation account, or answer No above.";
    }
    if (current === 2 && !data.selection_method) {
      e['selection_method'] = "Please choose how you will select your entry.";
    }
    if (current === 3 && data.selection_method === "internal" && !data.entry_unknown) {
      if (!data.artist.trim()) e['artist'] = "Artist is required.";
      if (!data.song_title.trim()) e['song_title'] = "Song title is required.";
      if (!data.song_url.trim()) e['song_url'] = "Song link is required.";
      else if (!isValidUrl(data.song_url)) e['song_url'] = "Enter a valid link starting with https://";
      if (parseTimestamp(data.preview_start) === null)
        e['preview_start'] = "Enter a start time as MM:SS (e.g. 01:12).";
      if (parseTimestamp(data.final_clip_start) === null)
        e['final_clip_start'] = "Enter a start time as MM:SS (e.g. 00:48).";
      if (data.replacement_video_required) {
        if (!data.replacement_video_url.trim())
          e['replacement_video_url'] = "A replacement video link is required.";
        else if (!isValidUrl(data.replacement_video_url))
          e['replacement_video_url'] = "Enter a valid link starting with https://";
      }
    }
    if (current === 3 && data.selection_method === "national_final") {
      if (!data.nf_name.trim()) e['nf_name'] = "National Final name is required.";
      if (!data.nf_entries_unknown) {
        if (data.nf_entries.length === 0) e['nf_entries'] = "Add at least one entry, or tick “NF entries not known yet”.";
        data.nf_entries.forEach((entry, i) => {
          if (!entry.artist.trim() || !entry.song_title.trim())
            e[`nf_entry_${i}`] = "Artist and song title are required.";
          else if (entry.song_url.trim() && !isValidUrl(entry.song_url))
            e[`nf_entry_${i}`] = "Enter a valid song link.";
        });
      }
      if (!data.nf_date_type) e['nf_date_type'] = "Choose when the National Final will finish.";
      if (data.nf_date_type === "exact" && !data.nf_exact_date) e['nf_date_type'] = "Pick a date.";
      if (data.nf_date_type === "approximate" && !data.nf_approximate_text.trim())
        e['nf_date_type'] = "Describe the approximate date.";
      if (!data.nf_result_date_type) e['nf_result_date_type'] = "Choose when the winner will be known.";
      if (data.nf_result_date_type === "exact" && !data.nf_result_exact_date)
        e['nf_result_date_type'] = "Pick a date.";
      if (data.nf_result_date_type === "approximate" && !data.nf_result_approximate_text.trim())
        e['nf_result_date_type'] = "Describe the approximate date.";
    }
    if (current === 4) {
      if (!data.reveal_date_type) e['reveal_date_type'] = "Choose a release option.";
      if (data.reveal_date_type === "exact" && !data.reveal_exact_date)
        e['reveal_date_type'] = "Pick a date.";
      if (data.reveal_date_type === "approximate" && !data.reveal_approximate_text.trim())
        e['reveal_date_type'] = "Describe the approximate date.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next() {
    if (!validate(step)) return;

    if (step === 0) {
      setBusy(true);
      try {
        const res = await lookup({ data: { round_id: round.id, country: data.country } });
        if (res.exists && !res.canEdit) {
          setBlocked(
            "A confirmation for this country already exists in this round. Ask an organiser to reopen it if you need to make changes.",
          );
          setBusy(false);
          return;
        }
        if (res.exists && res.canEdit && res.submission) {
          const s = res.submission;
          const internal = s.internal_entries;
          const nf = s.national_finals;
          setEditingExisting(true);
          setData((d) => ({
            ...d,
            instagram_username: s.instagram_username ?? d.instagram_username,
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
            final_clip_start: internal?.final_clip_start ?? "",
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
          }));
        }
      } finally {
        setBusy(false);
      }
    }

    if (step === 1 && !data.participating) {
      await send(false);
      return;
    }
    if (step === 2 && data.selection_method === "unknown") {
      setStep(4);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    if (step === 4 && data.selection_method === "unknown") {
      setStep(2);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  async function send(participating: boolean) {
    setBusy(true);
    try {
      const payload: ConfirmationPayload = {
        ...data,
        participating,
        preview_end: previewEnd,
        final_clip_end: clipEnd,
      };
      const res = await submit({ data: payload });
      if (!res.ok) {
        if (res.error === "full")
          setBlocked("This confirmation round has reached its maximum number of submissions.");
        else if (res.error === "closed") setBlocked("Confirmations are currently closed.");
        else if (res.error === "duplicate")
          setBlocked("A confirmation for this country already exists in this round.");
        else setBlocked("Something went wrong while saving. Please try again.");
        return;
      }
      setDone(participating ? "submitted" : "not_participating");
    } finally {
      setBusy(false);
    }
  }

  if (blocked) {
    return (
      <div className="surface animate-rise p-8 text-center">
        <h2 className="text-xl font-semibold">We couldn't continue</h2>
        <p className="mt-3 text-sm text-muted-foreground">{blocked}</p>
        <Button variant="outline" className="mt-6" onClick={() => setBlocked(null)}>
          Back to the form
        </Button>
      </div>
    );
  }

  if (done === "not_participating") {
    return (
      <div className="surface animate-rise p-8 text-center">
        <h2 className="text-2xl font-semibold">Thanks for letting us know!</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {data.country} will not participate in this edition. You can close this page now.
        </p>
      </div>
    );
  }

  if (done === "submitted") {
    return (
      <div className="surface animate-rise p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-6" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold">Confirmation received</h2>
        <dl className="mx-auto mt-6 grid max-w-sm gap-3 text-left text-sm">
          <SummaryRow label="Country" value={data.country} />
          <SummaryRow label="Edition" value={round.edition_name} />
          <SummaryRow label="Submission round" value={round.name} />
          <SummaryRow
            label="Status"
            value={editingExisting ? "Confirmation updated" : "Participation confirmed"}
          />
        </dl>
      </div>
    );
  }

  const stepTitle = STEPS[step];
  const progress = ((step + 1) / visibleSteps.length) * 100;

  return (
    <div className="animate-rise space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <span>
            Step {step + 1} — {stepTitle}
          </span>
          <span>{visibleSteps.length} steps</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {editingExisting ? (
        <p className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          Editing has been enabled for {data.country}. Your previous answers are pre-filled — update
          them and submit again.
        </p>
      ) : null}

      <div className="surface space-y-6 p-6 sm:p-8">
        {step === 0 ? (
          <>
            <SectionHeading title="Delegation details" subtitle="Tell us who is submitting." />
            <Field label="Instagram username" error={errors['instagram_username']} htmlFor="ig">
              <Input
                id="ig"
                value={data.instagram_username}
                onChange={(e) => set("instagram_username", e.target.value)}
                placeholder="@username"
              />
            </Field>
            <Field
              label="Country"
              hint="Type your Solaris Song Contest country exactly as it should appear."
              error={errors['country']}
              htmlFor="country"
            >
              <Input
                id="country"
                value={data.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="e.g. Oland"
              />
            </Field>
            <Field label="Does your country have an official delegation Instagram account?">
              <Choice
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                value={data.has_country_account ? "yes" : "no"}
                onChange={(v) => set("has_country_account", v === "yes")}
              />
            </Field>
            {data.has_country_account ? (
              <Field label="Country Instagram account" error={errors['country_account']} htmlFor="ca">
                <Input
                  id="ca"
                  value={data.country_account}
                  onChange={(e) => set("country_account", e.target.value)}
                  placeholder="@solaris.oland"
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <SectionHeading title="Participation" subtitle="Are you joining the next edition?" />
            <Field label="Will you participate in the next edition of Solaris Song Contest?">
              <Choice
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                value={data.participating ? "yes" : "no"}
                onChange={(v) => set("participating", v === "yes")}
              />
            </Field>
            {!data.participating ? (
              <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                Selecting “No” will submit your response immediately and finish the form.
              </p>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <SectionHeading title="Selection method" subtitle="How will your entry be chosen?" />
            <Field label="How will you select your entry?" error={errors['selection_method']}>
              <Choice
                columns={1}
                options={[
                  { value: "internal", label: "Internal Selection" },
                  { value: "national_final", label: "National Final" },
                  { value: "unknown", label: "I don't know yet" },
                ]}
                value={data.selection_method}
                onChange={(v) => set("selection_method", v as ConfirmationPayload["selection_method"])}
              />
            </Field>
          </>
        ) : null}

        {step === 3 && data.selection_method === "internal" ? (
          <>
            <SectionHeading title="Internal selection" subtitle="Your entry details." />
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <span className="text-sm">I don't know my entry yet</span>
              <Switch
                checked={data.entry_unknown}
                onCheckedChange={(v) => set("entry_unknown", v)}
              />
            </label>
            {!data.entry_unknown ? (
              <>
                <Field label="Artist" error={errors['artist']}>
                  <Input value={data.artist} onChange={(e) => set("artist", e.target.value)} />
                </Field>
                <Field label="Song title" error={errors['song_title']}>
                  <Input
                    value={data.song_title}
                    onChange={(e) => set("song_title", e.target.value)}
                  />
                </Field>
                <Field
                  label="Song link"
                  hint="YouTube, Spotify, SoundCloud or any other valid link."
                  error={errors['song_url']}
                >
                  <Input
                    value={data.song_url}
                    onChange={(e) => set("song_url", e.target.value)}
                    placeholder="https://"
                  />
                </Field>
                <Field
                  label="Post preview timestamp"
                  hint="Choose the part of the song used for the 25-second song reveal / social media preview."
                  error={errors['preview_start']}
                >
                  <Input
                    value={data.preview_start}
                    onChange={(e) => set("preview_start", e.target.value)}
                    placeholder="MM:SS — e.g. 01:12"
                    inputMode="numeric"
                  />
                  {previewEnd ? (
                    <p className="text-xs text-accent">
                      Preview: {data.preview_start}–{previewEnd}
                    </p>
                  ) : null}
                </Field>
                <Field
                  label="Final performance clip timestamp"
                  hint="Choose the part of the video/song used for the 90-second final performance clip."
                  error={errors['final_clip_start']}
                >
                  <Input
                    value={data.final_clip_start}
                    onChange={(e) => set("final_clip_start", e.target.value)}
                    placeholder="MM:SS — e.g. 00:48"
                    inputMode="numeric"
                  />
                  {clipEnd ? (
                    <p className="text-xs text-accent">
                      Clip: {data.final_clip_start}–{clipEnd}
                    </p>
                  ) : null}
                </Field>
                <Field label="Do you need a replacement video for the final clip?">
                  <Choice
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                    value={data.replacement_video_required ? "yes" : "no"}
                    onChange={(v) => set("replacement_video_required", v === "yes")}
                  />
                </Field>
                {data.replacement_video_required ? (
                  <Field label="Replacement video link" error={errors['replacement_video_url']}>
                    <Input
                      value={data.replacement_video_url}
                      onChange={(e) => set("replacement_video_url", e.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                ) : null}
              </>
            ) : (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                Your entry will be stored as <strong>Entry not submitted yet</strong>. An organiser
                can reopen your submission later so you can add the song.
              </p>
            )}
          </>
        ) : null}

        {step === 3 && data.selection_method === "national_final" ? (
          <>
            <SectionHeading title="National Final" subtitle="Tell us about your selection show." />
            <Field label="National Final name" error={errors['nf_name']}>
              <Input value={data.nf_name} onChange={(e) => set("nf_name", e.target.value)} />
            </Field>
            <Field label="How many entries will compete?">
              <Input
                type="number"
                min={1}
                value={data.expected_entry_count}
                onChange={(e) => set("expected_entry_count", e.target.value)}
              />
            </Field>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <span className="text-sm">NF entries not known yet</span>
              <Switch
                checked={data.nf_entries_unknown}
                onCheckedChange={(v) => set("nf_entries_unknown", v)}
              />
            </label>

            {!data.nf_entries_unknown ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">National Final entries</p>
                  <span className="text-xs text-muted-foreground">
                    {data.nf_entries.length} added
                  </span>
                </div>
                {errors['nf_entries'] ? (
                  <p className="text-xs font-medium text-destructive">{errors['nf_entries']}</p>
                ) : null}
                {data.nf_entries.map((entry, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <GripVertical className="size-3.5" /> Entry {i + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={i === 0}
                          onClick={() => {
                            const list = [...data.nf_entries];
                            const item = list[i]!;
                            list[i] = list[i - 1]!;
                            list[i - 1] = item;
                            set("nf_entries", list);
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={i === data.nf_entries.length - 1}
                          onClick={() => {
                            const list = [...data.nf_entries];
                            const item = list[i]!;
                            list[i] = list[i + 1]!;
                            list[i + 1] = item;
                            set("nf_entries", list);
                          }}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            set(
                              "nf_entries",
                              data.nf_entries.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Artist"
                        value={entry.artist}
                        onChange={(e) => {
                          const list = [...data.nf_entries];
                          list[i] = { ...entry, artist: e.target.value };
                          set("nf_entries", list);
                        }}
                      />
                      <Input
                        placeholder="Song title"
                        value={entry.song_title}
                        onChange={(e) => {
                          const list = [...data.nf_entries];
                          list[i] = { ...entry, song_title: e.target.value };
                          set("nf_entries", list);
                        }}
                      />
                    </div>
                    <Input
                      className="mt-2"
                      placeholder="Song link (https://)"
                      value={entry.song_url}
                      onChange={(e) => {
                        const list = [...data.nf_entries];
                        list[i] = { ...entry, song_url: e.target.value };
                        set("nf_entries", list);
                      }}
                    />
                    {errors[`nf_entry_${i}`] ? (
                      <p className="mt-2 text-xs font-medium text-destructive">
                        {errors[`nf_entry_${i}`]}
                      </p>
                    ) : null}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    set("nf_entries", [
                      ...data.nf_entries,
                      { artist: "", song_title: "", song_url: "" },
                    ])
                  }
                >
                  <Plus className="size-4" /> Add entry
                </Button>
              </div>
            ) : null}

            <Field label="Expected National Final date" error={errors['nf_date_type']}>
              <DateChoice
                value={data.nf_date_type}
                onChange={(v) => set("nf_date_type", v)}
                exact={data.nf_exact_date}
                onExact={(v) => set("nf_exact_date", v)}
                approx={data.nf_approximate_text}
                onApprox={(v) => set("nf_approximate_text", v)}
                errors={{}}
                prefix="nf_date_type"
                approxPlaceholder="Late September / Around 20–25 September"
              />
            </Field>

            <Field label="When should the winning entry be known?" error={errors['nf_result_date_type']}>
              <DateChoice
                value={data.nf_result_date_type}
                onChange={(v) => set("nf_result_date_type", v)}
                exact={data.nf_result_exact_date}
                onExact={(v) => set("nf_result_exact_date", v)}
                approx={data.nf_result_approximate_text}
                onApprox={(v) => set("nf_result_approximate_text", v)}
                errors={{}}
                prefix="nf_result_date_type"
                approxPlaceholder="Right after the final / Early October"
              />
            </Field>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <SectionHeading
              title="Release date"
              subtitle="When may Solaris reveal your song publicly?"
            />
            <Field
              label="Earliest date Solaris is allowed to publicly reveal your song"
              error={errors['reveal_date_type']}
            >
              <DateChoice
                value={data.reveal_date_type}
                onChange={(v) => set("reveal_date_type", v)}
                exact={data.reveal_exact_date}
                onExact={(v) => set("reveal_exact_date", v)}
                approx={data.reveal_approximate_text}
                onApprox={(v) => set("reveal_approximate_text", v)}
                allowImmediate
                errors={{}}
                prefix="reveal_date_type"
                approxPlaceholder="After 14 September / After my national final"
              />
            </Field>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <SectionHeading title="Review your answers" subtitle="Check everything before sending." />
            <ReviewBlock title="Delegation">
              <SummaryRow label="Instagram" value={data.instagram_username} />
              <SummaryRow label="Country" value={data.country} />
              <SummaryRow
                label="Delegation account"
                value={data.has_country_account ? data.country_account : "No account"}
              />
            </ReviewBlock>
            <ReviewBlock title="Participation">
              <SummaryRow label="Participating" value={data.participating ? "Yes" : "No"} />
            </ReviewBlock>
            <ReviewBlock title="Selection method">
              <SummaryRow
                label="Method"
                value={
                  data.selection_method === "internal"
                    ? "Internal Selection"
                    : data.selection_method === "national_final"
                      ? "National Final"
                      : "Not decided yet"
                }
              />
            </ReviewBlock>
            {data.selection_method === "internal" ? (
              <ReviewBlock title="Song information">
                {data.entry_unknown ? (
                  <SummaryRow label="Entry" value="Entry not submitted yet" />
                ) : (
                  <>
                    <SummaryRow label="Artist" value={data.artist} />
                    <SummaryRow label="Song" value={data.song_title} />
                    <SummaryRow label="Link" value={data.song_url} />
                    <SummaryRow label="Preview" value={`${data.preview_start}–${previewEnd}`} />
                    <SummaryRow label="Final clip" value={`${data.final_clip_start}–${clipEnd}`} />
                    <SummaryRow
                      label="Replacement video"
                      value={data.replacement_video_required ? data.replacement_video_url : "Not needed"}
                    />
                  </>
                )}
              </ReviewBlock>
            ) : null}
            {data.selection_method === "national_final" ? (
              <ReviewBlock title="National Final">
                <SummaryRow label="Name" value={data.nf_name} />
                <SummaryRow label="Expected entries" value={data.expected_entry_count || "—"} />
                <SummaryRow
                  label="Entries"
                  value={
                    data.nf_entries_unknown
                      ? "NF entries not known yet"
                      : data.nf_entries
                          .map((e, i) => `${i + 1}. ${e.artist} — ${e.song_title}`)
                          .join(" · ")
                  }
                />
                <SummaryRow label="NF finishes" value={describeDate(data.nf_date_type, data.nf_exact_date, data.nf_approximate_text)} />
                <SummaryRow
                  label="Winner known"
                  value={describeDate(
                    data.nf_result_date_type,
                    data.nf_result_exact_date,
                    data.nf_result_approximate_text,
                  )}
                />
              </ReviewBlock>
            ) : null}
            <ReviewBlock title="Release information">
              <SummaryRow
                label="Earliest reveal"
                value={describeDate(
                  data.reveal_date_type,
                  data.reveal_exact_date,
                  data.reveal_approximate_text,
                )}
              />
            </ReviewBlock>
          </>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <Button variant="ghost" onClick={back} disabled={step === 0 || busy}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < 5 ? (
            <Button onClick={next} disabled={busy}>
              {step === 1 && !data.participating ? "Submit response" : "Continue"}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} disabled={busy}>
                Edit answers
              </Button>
              <Button onClick={() => send(true)} disabled={busy}>
                {busy ? "Submitting…" : "Submit confirmation"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function describeDate(type: string, exact: string, approx: string) {
  if (type === "exact") return exact || "—";
  if (type === "approximate") return approx || "—";
  if (type === "immediately") return "Can be revealed immediately";
  if (type === "unknown") return "Not known yet";
  return "—";
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-all">{value || "—"}</dd>
    </div>
  );
}

export { Textarea };
