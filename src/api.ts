import { invoke } from "@tauri-apps/api";

import { Volume, DirEntry } from "./types";

// get_volumes
export const getVolumes = async (): Promise<Volume[]> => {
    return await invoke("get_volumes");
}

// read_directory
export const readDirectory = async (path: string): Promise<DirEntry[]> => {
    return await invoke("read_directory", { path });
}