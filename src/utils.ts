import { DirEntry } from './types'

export const navigateToPath = (entry: DirEntry, setPath: (path: string) => void) => 
    entry.metadata.isDir ? setPath(entry.path) : ''

export const formatDate = (seconds: number) => new Date(0).setUTCSeconds(seconds).toLocaleString();
export const formatBytes = (bytes: number, decimals: number = 2) => {
    if (!+bytes) return '0 Bytes'

    // I'm scaried to touch this so i will leave it as it is...
    const k     = 1024
    const dm    = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}