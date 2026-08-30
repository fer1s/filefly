// ARIA roles retained by the local item/submenu adapter.
export const MENU_ROLE = "menu";
export const MENU_ITEM_ROLE = "menuitem";
// aria-haspopup value announcing that an item opens a nested menu.
export const SUBMENU_POPUP_ROLE = "menu";
export const MENU_ITEM_SELECTOR = `[role="${MENU_ITEM_ROLE}"]:not([disabled])`;

export const CONTEXT_MENU_INITIAL_POSITION = { x: 0, y: 0 };

// Grace period (ms) before a submenu closes on mouse-out, so the cursor can travel from the
// parent row onto the (detached) flyout without it vanishing mid-move.
export const SUBMENU_CLOSE_DELAY = 140;

// Gap (px) kept from the viewport edges when clamping the submenu flyout into view.
export const SUBMENU_VIEWPORT_PADDING = 8;
