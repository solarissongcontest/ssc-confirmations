import {
  useEffect,
  useState,
} from "react";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  Check,
  Copy,
  KeyRound,
  RefreshCw,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  getRecoveryCode,
  setRecoveryCode,
} from "@/lib/recovery.functions";

export function RecoveryCodeSetup({
  submissionId,
  browserSessionId,
}: {
  submissionId:
    string;

  browserSessionId:
    string;
}) {
  const getCode =
    useServerFn(
      getRecoveryCode,
    );

  const saveCode =
    useServerFn(
      setRecoveryCode,
    );

  const qc =
    useQueryClient();

  const [
    customCode,
    setCustomCode,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const {
    data,
    isLoading,
  } =
    useQuery({
      queryKey: [
        "recovery-code",
        submissionId,
        browserSessionId,
      ],

      queryFn:
        () =>
          getCode({
            data: {
              submission_id:
                submissionId,

              browser_session_id:
                browserSessionId,
            },
          }),

      retry:
        false,
    });

  const currentCode =
    data?.ok
      ? data.recovery_code ??
        ""
      : "";

  useEffect(() => {
    if (
      currentCode
    ) {
      setCustomCode(
        currentCode,
      );
    }
  }, [
    currentCode,
  ]);

  if (
    isLoading
  ) {
    return (
      <div className="surface p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />

          Preparing your
          recovery code…
        </div>
      </div>
    );
  }

  if (
    !data?.ok ||
    !currentCode
  ) {
    return null;
  }

  async function copyCode() {
    await navigator.clipboard.writeText(
      currentCode,
    );

    toast.success(
      "Recovery code copied",
    );
  }

  async function save() {
    const normalized =
      customCode
        .trim()
        .toUpperCase();

    if (
      normalized.length <
      6
    ) {
      toast.error(
        "Your code must contain at least 6 characters.",
      );

      return;
    }

    if (
      !/^[A-Z0-9_-]+$/.test(
        normalized,
      )
    ) {
      toast.error(
        "Use only letters, numbers, - and _.",
      );

      return;
    }

    setSaving(
      true,
    );

    try {
      const result =
        await saveCode({
          data: {
            submission_id:
              submissionId,

            browser_session_id:
              browserSessionId,

            recovery_code:
              normalized,
          },
        });

      if (
        !result.ok
      ) {
        if (
          result.error ===
          "code_taken"
        ) {
          toast.error(
            "That recovery code is already being used. Choose another one.",
          );
        } else if (
          result.error ===
          "invalid_code"
        ) {
          toast.error(
            "That recovery code is not valid.",
          );
        } else {
          toast.error(
            "Could not change the recovery code. Your original code is still safe.",
          );
        }

        return;
      }

      await qc.invalidateQueries({
        queryKey: [
          "recovery-code",
          submissionId,
          browserSessionId,
        ],
      });

      toast.success(
        "Recovery code updated",
      );
    } catch (
      error
    ) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Could not change the recovery code. Your submission is still saved.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <section className="surface overflow-hidden border border-accent/30">
      <div className="border-b border-border/60 bg-accent/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Confirmation
              received
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your
              submission has
              already been
              saved. Anything
              you do below is
              optional and
              cannot cancel
              your submission.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-accent" />

            <h3 className="font-medium">
              Edit recovery
              code
            </h3>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Use this code if
            you open Solaris
            confirmations in
            another browser.
            Keep it private.
          </p>
        </div>

        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Current recovery
            code
          </p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <code className="break-all text-lg font-semibold tracking-wider">
              {
                currentCode
              }
            </code>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void copyCode()
              }
            >
              <Copy className="size-4" />

              Copy
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label htmlFor="custom-recovery-code">
            Prefer your own
            code?
          </Label>

          <p className="text-xs text-muted-foreground">
            Optional. Use
            6–32 letters,
            numbers, hyphens
            or underscores.
            If you do
            nothing, the
            random code
            above stays
            active.
          </p>

          <Input
            id="custom-recovery-code"
            autoCapitalize="characters"
            value={
              customCode
            }
            onChange={(
              event,
            ) =>
              setCustomCode(
                event.target
                  .value
                  .toUpperCase(),
              )
            }
            maxLength={
              32
            }
          />

          <Button
            type="button"
            variant="outline"
            disabled={
              saving ||
              customCode
                .trim()
                .toUpperCase() ===
                currentCode
            }
            onClick={() =>
              void save()
            }
          >
            {saving
              ? "Saving…"
              : "Set my code"}
          </Button>
        </div>
      </div>
    </section>
  );
}
