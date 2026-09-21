import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { t } from "@/lang";

import { faWindows } from "@fortawesome/free-brands-svg-icons";
import { faServer as faServerSolid } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/ConnectionDialog.css";
import "@/styles/components/NetworkAddChooser.css";

import { NETWORK_ADD_CHOOSER_TITLE_ID } from "./constants";
import type { NetworkAddChooserProps } from "./types";

// Small chooser shown when adding to the sidebar's Network group: pick an SSH/SFTP connection or a
// Windows (SMB) share. Keeps the two different add-flows behind one "+" without a positioned popup.
const NetworkAddChooser = ({
  visible,
  onChooseSsh,
  onChooseSmb,
  onClose,
}: NetworkAddChooserProps) => {
  return (
    <Dialog
      visible={visible}
      title={t.smb.chooseTitle}
      onClose={onClose}
      className="connection_modal NetworkAddChooser"
    >
      <DialogHeader
        title={t.smb.chooseTitle}
        titleId={NETWORK_ADD_CHOOSER_TITLE_ID}
        onClose={onClose}
      />
      <div className="network_chooser_options">
        <Button className="network_chooser_option" onClick={onChooseSsh}>
          <Icon icon={faServerSolid} />
          <span className="network_chooser_label">{t.smb.chooseSsh}</span>
          <span className="network_chooser_hint">{t.smb.chooseSshHint}</span>
        </Button>
        <Button className="network_chooser_option" onClick={onChooseSmb}>
          <Icon icon={faWindows} />
          <span className="network_chooser_label">{t.smb.chooseSmb}</span>
          <span className="network_chooser_hint">{t.smb.chooseSmbHint}</span>
        </Button>
      </div>
    </Dialog>
  );
};

export default NetworkAddChooser;
