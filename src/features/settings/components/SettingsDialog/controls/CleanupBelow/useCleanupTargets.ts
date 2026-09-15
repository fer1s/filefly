import { useCallback, useEffect, useState } from "react";

import { CLEANUP_MODE, type CleanupMode } from "@/shared/constants";
import type { CleanupTarget } from "@/shared/services/api";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { formatBytes } from "@/shared/utils";
import { t } from "@/lang";

import { useSettings } from "../../../../providers/SettingsProvider";

import { ADD_SENTINEL } from "./constants";
import type { CleanupTargetsState } from "./types";
import { cleanupErrorMessage } from "./utils";

// Owns the cleanup panel's state and every side effect behind it: measuring the registered folders,
// registering/unregistering one, switching its mode, and running a confirmed cleanup. Sizes come
// from a recursive walk in Rust, so a load is never instant — the panel renders a measuring hint
// while `targets` is null and re-measures after each mutation, because a cleanup invalidates every
// number it just showed.
//
// One operation at a time (`busyPath`): the sizes on screen are the basis for the confirmation the
// user just approved, so a second concurrent cleanup would act on stale figures.
export const useCleanupTargets = (): CleanupTargetsState => {
  const { manager } = useSettings();
  const { confirm } = useConfirm();
  const [targets, setTargets] = useState<CleanupTarget[] | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  // `signal` lets the mount effect drop a late response after unmount; direct callers omit it.
  const load = useCallback(
    (signal?: { active: boolean }) =>
      manager
        .getCleanupTargets()
        .then((result) => {
          if (!signal || signal.active) setTargets(result);
        })
        .catch(() => {
          if (!signal || signal.active) setTargets([]);
        }),
    [manager],
  );

  useEffect(() => {
    const signal = { active: true };
    void load(signal);
    return () => {
      signal.active = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setTargets(null);
    await load();
  }, [load]);

  // `path` is what the user typed — the backend trims it, expands a leading `~` and validates it.
  // Resolves true when the folder was registered (so the caller clears its input), false when it
  // was rejected.
  const add = useCallback(
    async (path: string): Promise<boolean> => {
      setBusyPath(ADD_SENTINEL);
      try {
        // New targets start in the safer mode: emptying contents never removes a directory another
        // tool expects to exist. The chip's mode toggle switches it.
        await manager.addCleanupTarget(path, CLEANUP_MODE.CONTENTS);
        await load();
        return true;
      } catch (error) {
        notify(cleanupErrorMessage(error), TOAST_TYPE.ERROR);
        return false;
      } finally {
        setBusyPath(null);
      }
    },
    [manager, load],
  );

  const remove = useCallback(
    async (path: string) => {
      setBusyPath(path);
      try {
        await manager.removeCleanupTarget(path);
        await load();
      } catch (error) {
        notify(cleanupErrorMessage(error), TOAST_TYPE.ERROR);
      } finally {
        setBusyPath(null);
      }
    },
    [manager, load],
  );

  const setMode = useCallback(
    async (path: string, mode: CleanupMode) => {
      // Optimistic: the selector is the only thing that changes and sizes stay valid, so there's no
      // need to re-measure. A failure reloads the persisted truth.
      setTargets(
        (current) =>
          current?.map((target) =>
            target.path === path ? { ...target, mode } : target,
          ) ?? current,
      );
      try {
        await manager.setCleanupTargetMode(path, mode);
      } catch (error) {
        notify(cleanupErrorMessage(error), TOAST_TYPE.ERROR);
        await load();
      }
    },
    [manager, load],
  );

  const clean = useCallback(
    async (target: CleanupTarget) => {
      const ok = await confirm({
        title: t.settings.cleanupClean,
        message:
          target.mode === CLEANUP_MODE.FOLDER
            ? t.settings.cleanupCleanFolderConfirm(
                target.path,
                formatBytes(target.size),
              )
            : t.settings.cleanupCleanContentsConfirm(
                target.path,
                formatBytes(target.size),
              ),
        confirmLabel: t.settings.cleanupClean,
        destructive: true,
      });
      if (!ok) return;

      setBusyPath(target.path);
      try {
        const result = await manager.cleanCleanupTarget(target.path);
        if (result.removed === 0 && result.failed === 0)
          notify(t.settings.cleanupAlreadyEmpty, TOAST_TYPE.INFO);
        else if (result.failed > 0)
          notify(
            t.settings.cleanupPartial(
              formatBytes(result.freed),
              result.failed,
              result.firstError ?? "",
            ),
            TOAST_TYPE.ERROR,
          );
        else
          notify(
            t.settings.cleanupFreed(formatBytes(result.freed)),
            TOAST_TYPE.SUCCESS,
          );
        await load();
      } catch (error) {
        notify(cleanupErrorMessage(error), TOAST_TYPE.ERROR);
      } finally {
        setBusyPath(null);
      }
    },
    [confirm, manager, load],
  );

  const total = (targets ?? []).reduce((sum, target) => sum + target.size, 0);

  return { targets, total, busyPath, refresh, add, remove, setMode, clean };
};
