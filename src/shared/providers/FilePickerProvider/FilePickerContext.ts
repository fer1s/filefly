import { createContext, useContext } from "react";

import { pickFile as nativePickFile } from "@/shared/services/api";

import type { FilePickerContextValue } from "./types";

// Falls back to the native OS picker if no provider is mounted (defensive; the app always mounts one).
const fallback: FilePickerContextValue = {
  pickFile: (options) => nativePickFile(options?.extensions),
};

export const FilePickerContext =
  createContext<FilePickerContextValue>(fallback);

export const useFilePicker = () => useContext(FilePickerContext);
