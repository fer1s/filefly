import { useStateContext } from "@/shared/providers/StateProvider";
import Icon from "@/shared/components/elements/Icon";
import Button from "@/shared/components/elements/Button";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/NtfsNotice.css";

import { FUSE_T_URL, NTFS_INSTALL_COMMAND } from "./constants";
import type { NtfsNoticeProps } from "./types";

// Banner shown when the active folder is on a read-only NTFS volume (macOS can't write NTFS
// without a driver). Guides the user to install FUSE-T + ntfs-3g, then re-probe writability.
const NtfsNotice = ({ recheck }: NtfsNoticeProps) => {
  const { fs } = useStateContext();

  const copyCommand = () =>
    navigator.clipboard
      .writeText(NTFS_INSTALL_COMMAND)
      .then(() => notify(t.common.copied, TOAST_TYPE.SUCCESS));

  return (
    <div className="NtfsNotice">
      <Icon icon={faTriangleExclamation} className="ntfs_icon" />
      <div className="ntfs_text">
        <h3 className="ntfs_title">{t.directory.ntfs.title}</h3>
        <p className="ntfs_description">{t.directory.ntfs.description}</p>
        <p className="ntfs_hint">{t.directory.ntfs.steps}</p>
      </div>
      <div className="ntfs_actions">
        <Button onClick={() => fs.openExternalUrl(FUSE_T_URL)}>
          {t.directory.ntfs.download}
        </Button>
        <Button onClick={copyCommand}>{t.directory.ntfs.copyCommand}</Button>
        <Button onClick={recheck}>{t.directory.ntfs.recheck}</Button>
      </div>
    </div>
  );
};

export default NtfsNotice;
