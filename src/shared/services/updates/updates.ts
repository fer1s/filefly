import { useSyncExternalStore } from "react";
import { getVersion } from "@tauri-apps/api/app";

import {
  FORCE_UPDATE_TEST,
  FORCE_UPDATE_TEST_VERSION,
  RELEASES_API,
  UPDATE_CHECK_TIMEOUT_MS,
  UPDATE_STATUS,
} from "./constants";
import type { ReleaseInfo, UpdateState } from "./types";

// Update checker: reads the latest GitHub Release and compares it to the running version. Kept as
// a tiny external store (not React state) so the launch hook, the toast and the Settings row all
// see the same result without threading props, and so a check survives dialog unmounts.

let state: UpdateState = {
  status: UPDATE_STATUS.IDLE,
  current: "",
  latest: null,
  checkedAt: null,
};
const listeners = new Set<() => void>();

const setState = (patch: Partial<UpdateState>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getUpdateState = () => state;

// Live view of the update state for React components.
export const useUpdateState = () =>
  useSyncExternalStore(subscribe, getUpdateState, getUpdateState);

// Numeric semver compare on "major.minor.patch" (any leading "v" and pre-release/build suffix are
// dropped). Positive when `a` is newer than `b`.
export const compareVersions = (a: string, b: string): number => {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(/[-+]/)[0]
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

// Fetch the newest published release (pre-releases count; drafts don't).
const fetchLatestRelease = async (): Promise<ReleaseInfo> => {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    UPDATE_CHECK_TIMEOUT_MS,
  );
  try {
    const response = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const body = (await response.json()) as {
      tag_name: string;
      html_url: string;
      draft: boolean;
    }[];
    const release = body.find((r) => !r.draft);
    if (!release) throw new Error("No published releases");
    return {
      version: release.tag_name.replace(/^v/i, ""),
      url: release.html_url,
    };
  } finally {
    window.clearTimeout(timer);
  }
};

// Run a check (concurrent calls share the in-flight one). Resolves to the resulting state; never
// rejects — failures land in status ERROR so callers just read the store.
let inFlight: Promise<UpdateState> | null = null;

export const checkForUpdates = (): Promise<UpdateState> => {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    setState({ status: UPDATE_STATUS.CHECKING });
    try {
      const current = FORCE_UPDATE_TEST
        ? FORCE_UPDATE_TEST_VERSION
        : state.current || (await getVersion());
      const latest = await fetchLatestRelease();
      setState({
        current,
        latest,
        checkedAt: Date.now(),
        status:
          compareVersions(latest.version, current) > 0
            ? UPDATE_STATUS.AVAILABLE
            : UPDATE_STATUS.UP_TO_DATE,
      });
    } catch (error) {
      console.error("Update check failed:\n" + error);
      setState({ status: UPDATE_STATUS.ERROR, checkedAt: Date.now() });
    } finally {
      inFlight = null;
    }
    return state;
  })();
  return inFlight;
};
