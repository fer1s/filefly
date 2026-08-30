import { lazy } from "react";

import { MountOnce } from "@/shared/components/patterns/Deferred";

import { useChangelog } from "../../providers/ChangelogProvider";
import { useWhatsNew } from "../../hooks/useWhatsNew";
import type { ChangelogDialogProps } from "./types";

const ChangelogDialogView = lazy(() => import("./ChangelogDialog"));

// Always-mounted host: runs the post-update "what's new" detection eagerly and loads the dialog
// (plus the bundled CHANGELOG.md it imports) only the first time it opens.
const ChangelogDialogHost = ({ settingsReady }: ChangelogDialogProps) => {
  const { visible } = useChangelog();
  useWhatsNew(settingsReady);
  return (
    <MountOnce when={visible}>
      <ChangelogDialogView />
    </MountOnce>
  );
};

export default ChangelogDialogHost;
