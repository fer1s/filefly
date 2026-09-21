import Icon from "@/shared/components/elements/Icon";
import Button from "@/shared/components/elements/Button";
import { t } from "@/lang";

import { faLinkSlash } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/RemoteErrorNotice.css";

import type { RemoteErrorNoticeProps } from "./types";

// Shown when a remote (SFTP) listing fails — connect refused, auth rejected, host key changed.
// Persistent (unlike a toast) so the folder never looks deceptively empty, with a retry shortcut.
const RemoteErrorNotice = ({ error, retry }: RemoteErrorNoticeProps) => (
  <div className="RemoteErrorNotice">
    <Icon icon={faLinkSlash} className="remote_error_icon" />
    <h2 className="remote_error_title">{t.directory.remoteError.title}</h2>
    <p className="remote_error_description">{error}</p>
    <Button onClick={retry}>{t.directory.remoteError.retry}</Button>
  </div>
);

export default RemoteErrorNotice;
