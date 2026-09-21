import Spinner from "@/shared/components/elements/Spinner";
import Button from "@/shared/components/elements/Button";
import { t } from "@/lang";

import "@/styles/components/StalledNotice.css";

import type { StalledNoticeProps } from "./types";

// Shown in place of the listing when a read hangs far past normal — almost always a network share
// whose server went away (reads on the dead mount block for the OS's full SMB timeout). The app
// stays fully responsive underneath; this keeps it clearly *alive* (a spinner, not a frozen empty
// folder) and offers an immediate way out that abandons the pending read instead of waiting.
const StalledNotice = ({ onLeave }: StalledNoticeProps) => (
  <div className="StalledNotice">
    <Spinner />
    <h2 className="stalled_title">{t.directory.stalled.title}</h2>
    <p className="stalled_description">{t.directory.stalled.description}</p>
    <Button onClick={onLeave}>{t.directory.stalled.leave}</Button>
  </div>
);

export default StalledNotice;
