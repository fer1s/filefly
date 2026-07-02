import Switcher from "@/shared/components/elements/Switcher";

import type { ToggleControlProps } from "./types";

// Boolean setting → the shared pill switch, bound generically to the descriptor's key.
const ToggleControl = ({
  descriptor,
  settings,
  update,
}: ToggleControlProps) => (
  <Switcher
    checked={Boolean(settings[descriptor.key])}
    onChange={() => update({ [descriptor.key]: !settings[descriptor.key] })}
  />
);

export default ToggleControl;
