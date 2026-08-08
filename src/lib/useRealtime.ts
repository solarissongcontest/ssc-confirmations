import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to postgres changes on a set of tables and run a callback.
 * One channel per hook instance, torn down on unmount.
 */
export function useRealtime(
  channelName: string,
  tables: string[],
  onChange: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    let channel = supabase.channel(channelName);
    for (const table of tables) {
      channel = channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => onChange(),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, tables.join(",")]);
}

/** Invalidate admin queries whenever submissions, drafts or rounds change. */
export function useAdminRealtime() {
  const qc = useQueryClient();
  useRealtime(
    "admin-live",
    ["submissions", "submission_drafts", "submission_rounds", "round_stats"],
    () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["submission"] });
      qc.invalidateQueries({ queryKey: ["drafts"] });
      qc.invalidateQueries({ queryKey: ["editions"] });
    },
  );
}
