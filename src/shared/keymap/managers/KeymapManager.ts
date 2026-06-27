import * as api from "@/shared/services/api";

import type { Keymap } from "../types";

// Encapsulates keymap domain operations. Consumed through KeymapProvider.
export class KeymapManager {
  // Load the keymap from the backend (reads keymap.toml, falling back to bundled defaults).
  getKeymap(): Promise<Keymap> {
    return api.getKeymap();
  }

  // TODO: setBinding(action, binding) — persist a binding change to keymap.toml via a
  // `set_keymap_binding` Rust command (create the file from the defaults on first write).
  // Wire this up when the keymapping settings UI lands.
}
