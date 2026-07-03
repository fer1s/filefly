import { createContext, useContext } from "react";

import { pickFolder as nativePickFolder } from "@/shared/services/api";

import type { FolderPickerContextValue } from "./types";

// Falls back to the native OS picker if no provider is mounted (defensive; the app always mounts one).
const fallback: FolderPickerContextValue = {
  pickFolder: () => nativePickFolder(),
};

export const FolderPickerContext =
  createContext<FolderPickerContextValue>(fallback);

export const useFolderPicker = () => useContext(FolderPickerContext);
