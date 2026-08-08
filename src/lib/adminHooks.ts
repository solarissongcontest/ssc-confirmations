import {
  useEffect,
  useMemo,
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
  listEditions,
  listSubmissions,
} from "@/lib/admin.functions";

import type {
  AdminSubmission,
} from "@/lib/adminModel";

import {
  supabase,
} from "@/integrations/supabase/client";

/* ============================================================
 * TYPES
 * ========================================================== */

export interface AdminEdition {
  id: string;

  name: string;

  edition_number: number;

  description:
    | string
    | null;

  status: string;

  created_at: string;

  submission_rounds: {
    id: string;

    name: string;

    status: string;

    opens_at:
      | string
      | null;

    closes_at:
      | string
      | null;

    response_limit:
      | number
      | null;

    created_at: string;

    edition_id: string;
  }[];
}

/* ============================================================
 * EDITIONS
 * ========================================================== */

export function useEditions() {
  const fn =
    useServerFn(
      listEditions,
    );

  const queryClient =
    useQueryClient();

  /*
   * Listen for changes to editions and rounds.
   *
   * This means things such as:
   * - round status
   * - response limit
   * - opening time
   * - closing time
   * - edition status
   *
   * update in the admin without a manual refresh.
   */
  useEffect(() => {
    const channel =
      supabase
        .channel(
          "admin-editions-live",
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "editions",
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: [
                "editions",
              ],
            });
          },
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "submission_rounds",
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: [
                "editions",
              ],
            });
          },
        )

        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    queryClient,
  ]);

  return useQuery({
    queryKey: [
      "editions",
    ],

    queryFn:
      async () =>
        (await fn()) as unknown as AdminEdition[],

    /*
     * Realtime should normally handle this.
     *
     * Polling is a fallback for:
     * - sleeping mobile browsers
     * - temporarily disconnected realtime
     * - tables not included in a realtime publication
     */
    refetchInterval:
      10_000,

    refetchOnWindowFocus:
      true,

    refetchOnReconnect:
      true,

    staleTime:
      0,
  });
}

/* ============================================================
 * SUBMISSIONS
 * ========================================================== */

export function useSubmissions(
  filter: {
    edition_id?: string;

    round_id?: string;
  },
) {
  const fn =
    useServerFn(
      listSubmissions,
    );

  const queryClient =
    useQueryClient();

  /*
   * Re-fetch submission queries whenever anything related
   * to a confirmation changes.
   *
   * We listen to the parent submission AND its entry tables
   * because the submission can be inserted first and its
   * internal/NF details inserted immediately afterwards.
   */
  useEffect(() => {
    const refreshSubmissions =
      () => {
        void queryClient.invalidateQueries({
          queryKey: [
            "submissions",
          ],
        });

        /*
         * Round/edition information can also change after
         * submissions, for example when a round reaches its
         * response limit and auto-closes.
         */
        void queryClient.invalidateQueries({
          queryKey: [
            "editions",
          ],
        });
      };

    const channel =
      supabase
        .channel(
          `admin-submissions-live-${filter.edition_id ?? "all"}-${filter.round_id ?? "all"}`,
        )

        /* Main confirmation */
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "submissions",
          },
          refreshSubmissions,
        )

        /* Internal entry */
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "internal_entries",
          },
          refreshSubmissions,
        )

        /* National Final */
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "national_finals",
          },
          refreshSubmissions,
        )

        /* NF songs */
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "national_final_entries",
          },
          refreshSubmissions,
        )

        /* Round counts/status */
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "submission_rounds",
          },
          refreshSubmissions,
        )

        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    queryClient,
    filter.edition_id,
    filter.round_id,
  ]);

  return useQuery({
    queryKey: [
      "submissions",
      filter.edition_id ??
        "",
      filter.round_id ??
        "",
    ],

    queryFn:
      async () =>
        (await fn({
          data:
            filter,
        })) as unknown as AdminSubmission[],

    /*
     * Backup automatic refresh.
     *
     * Even if Realtime temporarily fails, the admin will
     * never stay stale for more than about 3 seconds.
     */
    refetchInterval:
      3_000,

    /*
     * Returning to the admin tab immediately fetches fresh data.
     */
    refetchOnWindowFocus:
      true,

    /*
     * If Wi-Fi/data disconnects and reconnects, fetch again.
     */
    refetchOnReconnect:
      true,

    /*
     * Always treat this information as live.
     */
    staleTime:
      0,
  });
}

/* ============================================================
 * EDITION + ROUND SCOPE
 * ========================================================== */

/**
 * Edition + round selector state shared across admin pages.
 */
export function useScope(
  editions:
    | AdminEdition[]
    | undefined,
) {
  const [
    editionId,
    setEditionId,
  ] =
    useState<string>(
      "",
    );

  const [
    roundId,
    setRoundId,
  ] =
    useState<string>(
      "",
    );

  const edition =
    useMemo(
      () =>
        editions?.find(
          (edition) =>
            edition.id ===
            editionId,
        ) ??
        editions?.[0],
      [
        editions,
        editionId,
      ],
    );

  const rounds =
    edition?.submission_rounds ??
    [];

  const round =
    rounds.find(
      (round) =>
        round.id ===
        roundId,
    );

  return {
    editionId:
      edition?.id ??
      "",

    roundId:
      round?.id ??
      "",

    edition,

    round,

    rounds,

    setEditionId:
      (
        id: string,
      ) => {
        setEditionId(
          id,
        );

        setRoundId(
          "",
        );
      },

    setRoundId,
  };
}
