// ARIA role for menu entries, and the selector used to find the focusable (enabled) ones for
// keyboard roaming. Kept together so the role and the query can't drift apart.
export const MENU_ITEM_ROLE = "menuitem";
export const MENU_ITEM_SELECTOR = `[role="${MENU_ITEM_ROLE}"]:not([disabled])`;

// Grace period (ms) before a submenu closes on mouse-out, so the cursor can travel from the
// parent row onto the (detached) flyout without it vanishing mid-move.
export const SUBMENU_CLOSE_DELAY = 140;

// Gap (px) kept from the viewport edges when clamping the submenu flyout into view.
export const SUBMENU_VIEWPORT_PADDING = 8;
