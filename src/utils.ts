import { DirEntry } from './types'

export const navigateToPath = (entry: DirEntry, setPath: (path: string) => void) => {
   if (entry.metadata.isDir) {
      setPath(entry.path)
   }
}

export const formatDate = (secs: number) => {
   const d = new Date(0);
   d.setUTCSeconds(secs);

   return d.toLocaleString();
}

export const formatBytes = (bytes: number, decimals = 2) => {
   if (!+bytes) return '0 Bytes'

   const k = 1024
   const dm = decimals < 0 ? 0 : decimals
   const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

   const i = Math.floor(Math.log(bytes) / Math.log(k))

   return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}