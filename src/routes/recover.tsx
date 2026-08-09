import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useMemo,
  useState,
} from "react";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  ArrowLeft,
  KeyRound,
} from "lucide-react";

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
  getPublicRounds,
  type PublicRound,
} from "@/lib/public.functions";

import {
  recoverSubmission,
} from "@/lib/recovery.functions";

import {
  getBrowserSessionId,
} from "@/lib/session";

export const Route =
  createFileRoute(
    "/recover",
  )({
    loader:
      () =>
        getPublicRounds(),

    component:
      RecoverPage,
  });

function RecoverPage() {
  const rounds:
    PublicRound[] =
    Route.useLoaderData();

  const recover =
    useServerFn(
      recoverSubmission,
    );

  const sessionId =
    useMemo(
      () =>
        getBrowserSessionId(),
      [],
    );

  const [
    roundId,
    setRoundId,
  ] =
    useState(
      rounds.length ===
        1
        ? rounds[0]!.id
        : "",
    );

  const [
    country,
    setCountry,
  ] =
    useState("");

  const [
    code,
    setCode,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  async function submit() {
    setError(
      null,
    );

    if (
      !roundId
    ) {
      setError(
        "Choose the confirmation round.",
      );

      return;
    }

    if (
      !country.trim()
    ) {
      setError(
        "Enter your country.",
      );

      return;
    }

    if (
      !code.trim()
    ) {
      setError(
        "Enter your recovery code.",
      );

      return;
    }

    if (
      !sessionId
    ) {
      setError(
        "This browser is blocking local storage, so it cannot be remembered.",
      );

      return;
    }

    setBusy(
      true,
    );

    try {
      const result =
        await recover({
          data: {
            round_id:
              roundId,

            country:
              country.trim(),

            recovery_code:
              code
                .trim()
                .toUpperCase(),

            browser_session_id:
              sessionId,
          },
        });

      if (
        !result.ok ||
        !result.token
      ) {
        if (
          result.error ===
          "invalid_recovery"
        ) {
          setError(
            "That country and recovery code do not match.",
          );
        } else {
          setError(
            "The response could not be recovered.",
          );
        }

        return;
      }

      window.location.assign(
        `/edit/${encodeURIComponent(
          result.token,
        )}`,
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "The response could not be recovered.",
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10 sm:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />

        Back to
        confirmations
      </Link>

      <div className="surface mt-6 space-y-6 p-6 sm:p-8">
        <div>
          <div className="flex size-11 items-center justify-center rounded-full bg-accent/15 text-accent">
            <KeyRound className="size-5" />
          </div>

          <h1 className="mt-4 text-2xl font-semibold">
            Recover your
            response
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Opened Solaris
            confirmations in
            another browser?
            Enter your
            country and
            recovery code.
            This browser will
            then be remembered
            too.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recovery-round">
            Confirmation
            round
          </Label>

          <select
            id="recovery-round"
            value={
              roundId
            }
            onChange={(
              event,
            ) =>
              setRoundId(
                event.target
                  .value,
              )
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">
              Select round
            </option>

            {rounds.map(
              (
                round,
              ) => (
                <option
                  key={
                    round.id
                  }
                  value={
                    round.id
                  }
                >
                  {
                    round.edition_name
                  }
                  {" — "}
                  {
                    round.name
                  }
                </option>
              ),
            )}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recovery-country">
            Country
          </Label>

          <Input
            id="recovery-country"
            value={
              country
            }
            onChange={(
              event,
            ) =>
              setCountry(
                event.target
                  .value,
              )
            }
            placeholder="Oland"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recovery-code">
            Recovery code
          </Label>

          <Input
            id="recovery-code"
            value={
              code
            }
            autoCapitalize="characters"
            autoCorrect="off"
            onChange={(
              event,
            ) =>
              setCode(
                event.target
                  .value
                  .toUpperCase(),
              )
            }
            placeholder="AB12-CD34-EF56"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={
            busy
          }
          onClick={() =>
            void submit()
          }
        >
          <KeyRound className="size-4" />

          {busy
            ? "Recovering…"
            : "Recover response"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Your recovery code
          is private. Do not
          share it with
          another delegation.
        </p>
      </div>
    </main>
  );
}
