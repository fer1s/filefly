// Public API of the connections feature (SSH/SFTP remote browsing). See SSH_PLAN.md.
export { useConnections } from "./hooks/useConnections";
export { ConnectionsProvider } from "./providers/ConnectionsProvider";
export { ConnectionsManager } from "./managers/ConnectionsManager";
export { default as ConnectionDialog } from "./components/ConnectionDialog";
export { default as ConnectionAuthDialog } from "./components/ConnectionAuthDialog";
export { default as SmbDialog } from "./components/SmbDialog";
export { default as NetworkAddChooser } from "./components/NetworkAddChooser";
export { SmbManager } from "./managers/SmbManager";
export { SMB_OPEN_RESULT } from "./constants";
export type { SmbLocation, SmbOpenResult } from "./models";
