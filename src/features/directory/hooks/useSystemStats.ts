import { useEffect, useState } from "react";

import { getSystemStats, type SystemStats } from "@/shared/services/api";

import { SYSTEM_STATS_POLL_MS } from "../constants";

// Poll host CPU / RAM / disk usage while `enabled`, for the status-bar readout. Returns the latest
// snapshot (null until the first sample lands, or whenever disabled). Stops polling when disabled so
// the setting toggles off cleanly with no lingering timer; the return is guarded by `enabled` so no
// stale readout leaks through while off.
export const useSystemStats = (enabled: boolean): SystemStats | null => {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getSystemStats();
        if (!cancelled) setStats(next);
      } catch {
        // Transient failure (e.g. during shutdown) — keep the last snapshot, try again next tick.
      }
    };

    void poll();
    const timer = setInterval(poll, SYSTEM_STATS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return enabled ? stats : null;
};
