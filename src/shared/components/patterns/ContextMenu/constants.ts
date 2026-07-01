// ARIA role for menu entries, and the selector used to find the focusable (enabled) ones for
// keyboard roaming. Kept together so the role and the query can't drift apart.
export const MENU_ITEM_ROLE = "menuitem";
export const MENU_ITEM_SELECTOR = `[role="${MENU_ITEM_ROLE}"]:not([disabled])`;
