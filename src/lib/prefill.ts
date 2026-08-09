import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  ArrowLeft,
  LockKeyhole,
} from "lucide-react";

import {
  resolveEditToken,
} from "@/lib/public.functions";

import {
  ConfirmationForm,
} from "@/components/ConfirmationForm";

import {
  SubmissionReviewStatus,
} from "@/components/SubmissionReviewStatus";

import {
  Button,
} from "@/components/ui/button";

export const Route =
  createFileRoute(
    "/edit/$token",
  )({
    component:
      EditSubmissionPage,
  });

function EditSubmissionPage() {
  const {
    token,
  } =
    Route.useParams();

  const resolve =
    useServerFn(
      resolveEditToken,
    );

  const {
    data,
    isLoading,
  } =
    useQuery({
      queryKey: [
        "edit-token",
        token,
      ],

      queryFn:
        () =>
          resolve({
            data: {
              token,
            },
          }),

      retry:
        false,
    });

  if (
    isLoading
  ) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface p-8 text-center">
          Loading your
          confirmation…
        </div>
      </main>
    );
  }

  const result =
    data as
      | {
          valid?:
            boolean;

          reason?:
            string;

          submission?:
            any;

          round?:
            any;
        }
      | undefined;

  if (
    !result?.valid ||
    !result.submission ||
    !result.round
  ) {
    const editingClosed =
      result?.reason ===
      "editing_closed";

    return (
      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:py-16">
        <SubmissionReviewStatus
          mode="token"
          token={
            token
          }
        />

        <div className="surface p-8 text-center">
          <LockKeyhole className="mx-auto mb-4 size-8 text-muted-foreground" />

          <h1 className="text-xl font-semibold">
            {editingClosed
              ? "Editing is closed"
              : "This edit link is no longer valid"}
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {editingClosed
              ? "Your response and organiser review are still saved, but editing is currently disabled."
              : "The link may have expired, been revoked or already been used."}
          </p>

          <Button
            asChild
            variant="outline"
            className="mt-6"
          >
            <Link to="/">
              <ArrowLeft className="mr-2 size-4" />

              Return to
              confirmations
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {
            result.round
              .edition_name
          }
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Edit your
          confirmation
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {
            result.submission
              .country
          }
          {" · "}
          {
            result.round
              .name
          }
        </p>
      </header>

      <SubmissionReviewStatus
        mode="token"
        token={
          token
        }
      />

      <div className="surface border border-accent/25 p-4">
        <p className="text-sm font-medium">
          Editing your
          existing response
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          If you replace or
          change your entry,
          the organisers will
          need to check it
          again.
        </p>
      </div>

      <ConfirmationForm
        round={
          result.round
        }
        editToken={
          token
        }
        prefill={
          result.submission
        }
      />
    </main>
  );
}
