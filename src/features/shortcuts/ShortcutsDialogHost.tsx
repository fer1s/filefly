import { lazy } from "react";

import { MountOnce } from "@/shared/components/patterns/Deferred";
import { useShortcutHelp } from "@/shared/keymap";

const ShortcutsDialogView = lazy(() => import("./ShortcutsDialog"));

// Loads the cheat-sheet chunk the first time ⌘/ is pressed; the dialog reads its own open state.
const ShortcutsDialogHost = () => {
  const { active } = useShortcutHelp();
  return (
    <MountOnce when={active}>
      <ShortcutsDialogView />
    </MountOnce>
  );
};

export default ShortcutsDialogHost;
