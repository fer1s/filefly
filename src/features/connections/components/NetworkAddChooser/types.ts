export type NetworkAddChooserProps = {
  visible: boolean;
  // Chosen: open the SSH/SFTP connection form.
  onChooseSsh: () => void;
  // Chosen: open the add-Windows-share (SMB) form.
  onChooseSmb: () => void;
  onClose: () => void;
};
