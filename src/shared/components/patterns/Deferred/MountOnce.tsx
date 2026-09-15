import { Suspense, useState } from "react";

import type { MountOnceProps } from "./types";

// Defers a subtree until it is first needed, then keeps it mounted. Dialogs are rendered closed
// from the start (so their close animation and state survive), which means a plain React.lazy
// would still fetch their chunk on app start; gating the mount on the first open is what makes
// the split actually pay off. Stays mounted afterwards so closing animates and reopening is instant.
// Suspense with a null fallback: the chunk is read from local disk, so there is nothing worth
// showing for the few milliseconds it takes.
const MountOnce = ({ when, children }: MountOnceProps) => {
  const [mounted, setMounted] = useState(when);
  if (when && !mounted) setMounted(true);
  if (!mounted) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
};

export default MountOnce;
