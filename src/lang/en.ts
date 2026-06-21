// English translation resources, grouped by domain. Functions are used for interpolated strings.
export const en = {
  app: {
    name: "filefly",
  },
  common: {
    close: "Close",
    dismiss: "Dismiss",
    preview: "Preview",
    previous: "Previous",
    next: "Next",
    directory: "Directory",
    file: "File",
    unknown: "?",
  },
  contextMenu: {
    open: "Open",
    openInTerminal: "Open in Terminal",
    copy: "Copy",
    cut: "Cut",
    rename: "Rename",
    delete: "Delete",
    paste: "Paste",
    properties: "Properties",
  },
  properties: {
    title: "Properties",
    name: "Name",
    type: "Type",
    path: "Path",
    size: "Size",
    created: "Created",
    modified: "Modified",
    accessed: "Accessed",
  },
  details: {
    title: "Metadata",
    type: "Type",
    path: "Path",
    extension: "Extension",
  },
  sidebar: {
    pinned: "Pinned",
    drives: "Drives",
    searchPlaceholder: "Search...",
    clearSearch: "Clear search",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
    home: "Home",
    desktop: "Desktop",
    documents: "Documents",
    downloads: "Downloads",
    pictures: "Pictures",
  },
  pathbar: {
    pathPlaceholder: "Directory path",
  },
  volumes: {
    title: "Volumes",
    name: "Name",
    mountPoint: "Mount point",
    type: "Type",
    used: "Used",
    available: "Available",
    capacity: "Capacity",
    removable: "Removable",
    localDrive: "Local drive",
    freeOf: (free: string, total: string) => `${free} free of ${total}`,
  },
  directory: {
    noResults: (query: string) => `No results for "${query}"`,
    fileTypeNotSupported: "File type not supported",
    confirmDelete: (label: string) => `Move ${label} to the Trash?`,
    deleteTitle: "Delete",
    items: (n: number) => `${n} items`,
    itemCount: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
    selectedCount: (n: number) => `${n} ${n === 1 ? "item" : "items"} selected`,
  },
  errors: {
    open: (reason: string) => `Could not open file: ${reason}`,
    delete: (name: string, reason: string) =>
      `Could not delete ${name}: ${reason}`,
    paste: (name: string, reason: string) =>
      `Could not paste ${name}: ${reason}`,
    rename: (reason: string) => `Could not rename: ${reason}`,
  },
};

// English is the canonical dictionary shape. Other languages must satisfy this type.
export type TranslationDictionary = typeof en;
