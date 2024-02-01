import { invoke } from '@tauri-apps/api'

import { Volume, DirEntry } from './types'

// Get the user's disks (volumes)
export const getVolumes = async (): Promise<Volume[]> => await invoke('get_volumes')

// Read directory invokement method
export const readDirectory = async (path: string): Promise<DirEntry[]> => (await invokeWithPathArg('read_directory', path)) as DirEntry[]

// Open file invokement method
export const openFile = async (path: string): Promise<void> => (await invokeWithPathArg('open_file', path)) as void

// Open in terminal invokement method
export const openInTerminal = async (path: string): Promise<void> => (await invokeWithPathArg('open_in_terminal', path)) as void

// Generate markdown preview invokement method
export const generateMarkdownPreview = async (path: string): Promise<string> => (await invokeWithPathArg('md_to_html', path)) as string



// Helper function to invoke methods with a path argument
const invokeWithPathArg = async (method: 'open_in_terminal' | 'read_directory' | 'open_file' | 'md_to_html', path: string): Promise<DirEntry[] | void | string> =>
   await invoke(method, { path: path })
      .then((value) => value as void | DirEntry[])
      .catch((err) => {
         console.error('Path is either not valid or does not exist:\n' + err)
         if (method != 'read_directory') return
         return []
      })
