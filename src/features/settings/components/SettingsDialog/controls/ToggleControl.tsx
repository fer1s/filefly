import Switcher from "@/shared/components/elements/Switcher";
import { useConfirm } from "@/shared/providers/ConfirmProvider";

import type { ToggleControlProps } from "./types";

// Boolean setting → the shared pill switch, bound generically to the descriptor's key. When the
// descriptor declares `confirmOn`, switching ON (off → on) first asks for confirmation; turning it
// back OFF is immediate.
const ToggleControl = ({
  descriptor,
  settings,
  update,
}: ToggleControlProps) => {
  const { confirm } = useConfirm();
  const checked = Boolean(settings[descriptor.key]);

  const onChange = async () => {
    const next = !checked;
    if (next && descriptor.confirmOn) {
      const ok = await confirm({
        title: descriptor.confirmOn.title(),
        message: descriptor.confirmOn.message(),
      });
      if (!ok) return;
    }
    update({ [descriptor.key]: next });
  };

  return <Switcher checked={checked} onChange={onChange} />;
};

export default ToggleControl;
