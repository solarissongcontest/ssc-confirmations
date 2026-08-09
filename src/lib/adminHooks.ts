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

export const NEXT_IN_LINE_SCOPE =
  "__next_in_line__";

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

  editing_enabled:
    boolean;

  created_at: string;

  submission_rounds: {
    id: string;

    name: string;

    status: string;

    editing_enabled:
      boolean;

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

export interface AdminNextInLineSubmission {
  id: string;

  edition_id: string;

  source_submission_id:
    string;

  country: string;

  participating:
    boolean;

  entry_unknown:
    boolean;

  selection_type:
    | "none"
    | "unknown"
    | "internal"
    | "national_final";

  national_final_entry_id:
    | string
    | null;

  artist:
    | string
    | null;

  song_title:
    | string
    | null;

  song_url:
    | string
    | null;

  preview_start:
    | string
    | null;

  preview_end:
    | string
    | null;

  submitted_at:
    string;
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
        (
          await fn()
        ) as unknown as AdminEdition[],

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
 * NORMAL SUBMISSIONS
 * ========================================================== */

export function useSubmissions(
  filter: {
    edition_id?:
      string;

    round_id?:
      string;
  },
) {
  const fn =
    useServerFn(
      listSubmissions,
    );

  const queryClient =
    useQueryClient();

  useEffect(() => {
    const refresh =
      () => {
        void queryClient.invalidateQueries({
          queryKey: [
            "submissions",
          ],
        });

        void queryClient.invalidateQueries({
          queryKey: [
            "editions",
          ],
        });
      };

    const channel =
      supabase
        .channel(
          `admin-submissions-${filter.edition_id ?? "all"}-${filter.round_id ?? "all"}`,
        )

        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "submissions",
          },
          refresh,
        )

        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "internal_entries",
          },
          refresh,
        )

        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "national_finals",
          },
          refresh,
        )

        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "national_final_entries",
          },
          refresh,
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
          refresh,
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
        (
          await fn({
            data:
              filter,
          })
        ) as unknown as AdminSubmission[],

    refetchInterval:
      3_000,

    refetchOnWindowFocus:
      true,

    refetchOnReconnect:
      true,

    staleTime:
      0,
  });
}

/* ============================================================
 * NEXT IN LINE
 * ========================================================== */

export function useNextInLineSubmissions(
  editionId?:
    string,
) {
  const queryClient =
    useQueryClient();

  useEffect(() => {
    const refresh =
      () => {
        void queryClient.invalidateQueries({
          queryKey: [
            "next-in-line-submissions",
          ],
        });
      };

    const channel =
      supabase
        .channel(
          `admin-next-in-line-${editionId ?? "all"}`,
        )

        .on(
          "postgres_changes",
          {
            event: "*",

            schema:
              "public",

            table:
              "next_in_line_submissions",
          },
          refresh,
        )

        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    queryClient,
    editionId,
  ]);

  return useQuery({
    queryKey: [
      "next-in-line-submissions",

      editionId ??
        "",
    ],

    queryFn:
      async () => {
        const client =
          supabase as any;

        let query =
          client
            .from(
              "next_in_line_submissions",
            )
            .select(
              "*",
            )
            .order(
              "submitted_at",
              {
                ascending:
                  false,
              },
            );

        if (
          editionId
        ) {
          query =
            query.eq(
              "edition_id",
              editionId,
            );
        }

        const {
          data,
          error,
        } =
          await query;

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return (
          data ??
          []
        ) as AdminNextInLineSubmission[];
      },

    refetchInterval:
      3_000,

    refetchOnWindowFocus:
      true,

    refetchOnReconnect:
      true,

    staleTime:
      0,
  });
}

/* ============================================================
 * SCOPE
 * ========================================================== */

export function useScope(
  editions:
    | AdminEdition[]
    | undefined,
) {
  const [
    editionId,
    setEditionId,
  ] =
    useState("");

  const [
    roundId,
    setRoundIdState,
  ] =
    useState("");

  const edition =
    useMemo(
      () =>
        editions?.find(
          (
            item,
          ) =>
            item.id ===
            editionId,
        ) ??
        editions?.[0],

      [
        editions,
        editionId,
      ],
    );

  const rounds =
    edition
      ?.submission_rounds ??
    [];

  const isNextInLine =
    roundId ===
    NEXT_IN_LINE_SCOPE;

  const round =
    isNextInLine
      ? undefined
      : rounds.find(
          (
            item,
          ) =>
            item.id ===
            roundId,
        );

  const resolvedRoundId =
    isNextInLine
      ? NEXT_IN_LINE_SCOPE
      : round?.id ??
        "";

  function setRoundId(
    id: string,
  ) {
    setRoundIdState(
      id,
    );
  }

  return {
    editionId:
      edition?.id ??
      "",

    roundId:
      resolvedRoundId,

    isNextInLine,

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

        setRoundIdState(
          "",
        );
      },

    setRoundId,
  };
}
