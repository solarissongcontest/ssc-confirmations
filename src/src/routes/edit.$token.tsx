import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { resolveEditToken } from "@/lib/public.functions";
import { ConfirmationForm } from "@/components/ConfirmationForm";
import { Button } from "@/components/ui/button";
import { computeAvailability } from "@/lib/ssc";

export const Route = createFileRoute("/edit/$token")({
  component: EditSubmissionPage,
});

function EditSubmissionPage() {
  const { token } = Route.useParams();
  const resolve = useServerFn(resolveEditToken);

  const { data, isLoading } = useQuery({
    queryKey: ["edit-token", token],
    queryFn: () => resolve({ data: { token } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Loading your confirmation…
          </p>
        </div>
      </main>
    );
  }

  if (!data?.valid || !data.submission || !data.round) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface p-8 text-center">
          <LockKeyhole className="mx-auto mb-4 size-8 text-muted-foreground" />

          <h1 className="text-xl font-semibold">
            This edit link is no longer valid
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            The link may have expired, been revoked, already been used, or the
            response may have been locked by the contest administration.
          </p>

          <Button asChild variant="outline" className="mt-6">
            <Link to="/">
              <ArrowLeft className="mr-2 size-4" />
              Return to confirmations
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const availability = computeAvailability({
    status: data.round.status,
    count: data.round.response_count,
    limit: data.round.response_limit,
    opens_at: data.round.opens_at,
    closes_at: data.round.closes_at,
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {data.round.edition_name}
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Edit your confirmation
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {data.submission.country} · {data.round.name}
        </p>
      </header>

      <ConfirmationForm
        round={data.round}
        editToken={token}
        prefill={data.submission}
        availability={availability}
      />
    </main>
  );
}
