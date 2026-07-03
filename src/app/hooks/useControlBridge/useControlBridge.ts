import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { setUiState } from "@/shared/services/api";
import { tabPath, tabLabel } from "@/features/tabs";
import type { Tab } from "@/shared/models";
import { MAIN_WINDOW_LABEL, type ViewMode } from "@/shared/constants";

import {
  CONTROL_NAVIGATE,
  CONTROL_TAB,
  TAB_CONTROL_OP,
  type TabControlOp,
} from "./constants";

type TabControl = {
  op: TabControlOp;
  path?: string;
  id?: string;
  index?: number;
  from?: number;
  to?: number;
};

type ControlBridge = {
  tabs: Tab[];
  activeTabId: string;
  path: string;
  view: ViewMode;
  setPath: (path: string) => void;
  newTab: (path?: string) => void;
  closeTab: (id: string) => void;
  reorderTab: (from: number, to: number) => void;
};

const windowLabel = (): string => {
  try {
    return getCurrentWindow().label;
  } catch {
    // Non-Tauri context (e.g. tests).
    return MAIN_WINDOW_LABEL;
  }
};

// Bridges this window to the headless control channel (`sfb ui …`, and via it an MCP server):
//  * mirrors the live UI (current path, view, tabs) to Rust on every change, so `ui get-state` can
//    report it;
//  * applies inbound `navigate` events by moving the active tab to the requested path.
export const useControlBridge = ({
  tabs,
  activeTabId,
  path,
  view,
  setPath,
  newTab,
  closeTab,
  reorderTab,
}: ControlBridge): void => {
  // Push a fresh snapshot whenever the observed state changes.
  useEffect(() => {
    const snapshot = {
      window: windowLabel(),
      path,
      view,
      activeTabId,
      tabs: tabs.map((tab) => ({
        id: tab.id,
        path: tabPath(tab),
        label: tabLabel(tab),
      })),
    };
    void setUiState(JSON.stringify(snapshot));
  }, [tabs, activeTabId, path, view]);

  // Apply inbound navigate requests. Only the targeted window receives the event (emit_to label).
  useEffect(() => {
    const unlisten = listen<string>(CONTROL_NAVIGATE, (event) => {
      setPath(event.payload);
    });
    return () => {
      void unlisten.then((off) => off());
    };
  }, [setPath]);

  // Apply inbound tab operations (new / close / move). `tabs` is a dep so close-by-index resolves
  // against the current tab list.
  useEffect(() => {
    const unlisten = listen<TabControl>(CONTROL_TAB, (event) => {
      const req = event.payload;
      if (req.op === TAB_CONTROL_OP.NEW) {
        newTab(typeof req.path === "string" ? req.path : undefined);
      } else if (req.op === TAB_CONTROL_OP.CLOSE) {
        const id =
          req.id ??
          (typeof req.index === "number" ? tabs[req.index]?.id : undefined);
        if (id) closeTab(id);
      } else if (
        req.op === TAB_CONTROL_OP.MOVE &&
        typeof req.from === "number" &&
        typeof req.to === "number"
      ) {
        reorderTab(req.from, req.to);
      }
    });
    return () => {
      void unlisten.then((off) => off());
    };
  }, [tabs, newTab, closeTab, reorderTab]);
};
