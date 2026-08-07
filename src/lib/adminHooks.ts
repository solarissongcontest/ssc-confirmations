import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listEditions, listSubmissions } from "@/lib/admin.functions";
import type { AdminSubmission } from "@/lib/adminModel";

export interface AdminEdition {
  id: string;
  name: string;
  edition_number: number;
  description: string | null;
  status: string;
  created_at: string;
  submission_rounds: {
    id: string;
    name: string;
    status: string;
    opens_at: string | null;
    closes_at: string | null;
    response_limit: number | null;
    created_at: string;
    edition_id: string;
  }[];
}

export function useEditions() {
  const fn = useServerFn(listEditions);
  return useQuery({
    queryKey: ["editions"],
    queryFn: async () => (await fn()) as unknown as AdminEdition[],
  });
}

export function useSubmissions(filter: { edition_id?: string; round_id?: string }) {
  const fn = useServerFn(listSubmissions);
  return useQuery({
    queryKey: ["submissions", filter.edition_id ?? "", filter.round_id ?? ""],
    queryFn: async () => (await fn({ data: filter })) as unknown as AdminSubmission[],
  });
}

/** Edition + round selector state shared across admin pages. */
export function useScope(editions: AdminEdition[] | undefined) {
  const [editionId, setEditionId] = useState<string>("");
  const [roundId, setRoundId] = useState<string>("");

  const edition = useMemo(
    () => editions?.find((e) => e.id === editionId) ?? editions?.[0],
    [editions, editionId],
  );
  const rounds = edition?.submission_rounds ?? [];
  const round = rounds.find((r) => r.id === roundId);

  return {
    editionId: edition?.id ?? "",
    roundId: round?.id ?? "",
    edition,
    round,
    rounds,
    setEditionId: (id: string) => {
      setEditionId(id);
      setRoundId("");
    },
    setRoundId,
  };
}
