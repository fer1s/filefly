import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { setProbeResult } from "@/shared/services/api";
import { entryElementAt } from "@/features/directory/dropTarget";
import { getDragDiagnostics } from "@/features/directory/dragDiagnostics";

import { CONTROL_PROBE } from "./constants";
import { isDirEl, rectOf } from "./utils";
import type { ProbeRequest } from "./types";

// Headless drag-drop diagnostics. Answers `sfb ui-probe`: dumps every entry tile's rect + kind,
// and — given a CSS point (--x/--y) or a folder (--target) — reports which folder the real drop
// hit-test (entryElementAt) resolves. This is how the AI inspects why a folder does/doesn't
// highlight during a drag, without needing to perform a real OS drag.
export const useControlProbe = (): void => {
  useEffect(() => {
    const unlisten = listen<ProbeRequest>(CONTROL_PROBE, (event) => {
      const { id, args } = event.payload;
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(".dir_entry_item"),
      );

      const result: Record<string, unknown> = {
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        entryCount: items.length,
        // Native drag activity (event-type counts + last `over` sample), so a real drag can be
        // inspected after the fact — including whether the OS delivers any events to this webview.
        drag: getDragDiagnostics(),
        entries: items.map((el) => ({
          path: el.id,
          isDir: isDirEl(el),
          rect: rectOf(el),
        })),
      };

      // Hit-test an explicit CSS point.
      if (args && typeof args.x === "number" && typeof args.y === "number") {
        const el = entryElementAt(args.x, args.y, isDirEl);
        result.pointProbe = { x: args.x, y: args.y, resolved: el?.id ?? null };
      }

      // Hit-test a folder's own center (name or full path) — isolates the DOM hit-test from the
      // OS→CSS coordinate mapping: if `matches` is false, the geometry logic itself is wrong.
      if (args && args.target) {
        const target = args.target;
        const el = items.find(
          (i) => i.id === target || i.id.split("/").pop() === target,
        );
        if (!el) {
          result.targetProbe = { target, found: false };
        } else {
          const b = el.getBoundingClientRect();
          const center = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
          const resolved = entryElementAt(center.x, center.y, isDirEl);
          result.targetProbe = {
            target,
            found: true,
            isDir: isDirEl(el),
            path: el.id,
            center,
            resolved: resolved?.id ?? null,
            matches: resolved?.id === el.id,
          };
        }
      }

      void setProbeResult(id, JSON.stringify(result));
    });
    return () => {
      void unlisten.then((off) => off());
    };
  }, []);
};
