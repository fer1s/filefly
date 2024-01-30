import { invoke } from "@tauri-apps/api";

import { Volume, DirEntry } from "./types";

// get_volumes
export const getVolumes = async (): Promise<Volume[]> => {
    return await invoke("get_volumes");
}

// read_directory
export const readDirectory = async (path: string): Promise<DirEntry[]> => {
    if(!path) {
        console.error("Path is required");
        return [];
    }
    return await invoke("read_directory", { path });
}

// open_in_terminal
export const openInTerminal = async (path: string): Promise<void> => {
    if(!path) {
        console.error("Path is required");
        return;
    }
    console.log(path)
    await invoke("open_in_terminal", { path });
}