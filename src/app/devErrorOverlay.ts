// Dev-only on-screen error overlay. A React "Maximum update depth"/render throw unmounts the tree
// to a blank window with no crash report; this plain-DOM overlay lives outside React so it still
// shows the message + stack (a full screen over everything).
//
// It's installed only in development (import.meta.env.DEV — the debug build). It's dismissable ONLY
// when the app is still recoverable (the React root still has content): closing then reveals the
// working app underneath. If React fully unmounted (unrecoverable), there's nothing to return to,
// so the overlay can't be closed — reload to recover. Toggle with Cmd/Ctrl+Shift+E; Esc closes.

const OVERLAY_ID = "__sfb_dev_error_overlay";
const errors: string[] = [];
let dismissed = false;

// The app is "recoverable" while its React root still has rendered content — a render-loop throw
// unmounts everything, leaving #root empty, and then there's nothing to dismiss back to.
const rootAlive = (): boolean => {
  const root = document.getElementById("root");
  return !!root && root.childElementCount > 0;
};

const removeOverlay = (): void => document.getElementById(OVERLAY_ID)?.remove();

const render = (): void => {
  // Dismissed + recoverable → hide. Dismissed + unrecoverable → keep showing (can't close).
  if (dismissed && rootAlive()) {
    removeOverlay();
    return;
  }

  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:rgba(90,0,16,0.97);" +
      "color:#fff;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;" +
      "display:flex;flex-direction:column;padding:16px;gap:12px;";
    document.body.appendChild(overlay);
  }
  overlay.textContent = "";

  const recoverable = rootAlive();
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;gap:12px;flex:0 0 auto;";
  const title = document.createElement("strong");
  title.style.fontSize = "14px";
  title.textContent =
    `⚠ Dev error${errors.length > 1 ? ` (${errors.length})` : ""}` +
    (recoverable
      ? "  ·  Esc / ⇧⌘E to close"
      : "  ·  app crashed — reload to recover");
  header.appendChild(title);

  if (recoverable) {
    const close = document.createElement("button");
    close.textContent = "Close";
    close.style.cssText =
      "background:#fff;color:#7a0010;border:0;border-radius:4px;padding:4px 12px;" +
      "cursor:pointer;font:inherit;font-weight:600;";
    close.onclick = () => {
      dismissed = true;
      removeOverlay();
    };
    header.appendChild(close);
  }
  overlay.appendChild(header);

  const body = document.createElement("pre");
  body.style.cssText =
    "margin:0;overflow:auto;flex:1 1 auto;white-space:pre-wrap;word-break:break-word;";
  body.textContent = errors.join("\n\n──────────\n\n");
  overlay.appendChild(body);
};

const capture = (message: string): void => {
  errors.push(message);
  dismissed = false;
  render();
};

export const installDevErrorOverlay = (): void => {
  if (!import.meta.env.DEV) return;

  window.addEventListener("error", (e) =>
    capture(`ERROR: ${e.message}\n${e.error?.stack ?? ""}`),
  );
  window.addEventListener("unhandledrejection", (e) =>
    capture(`UNHANDLED: ${String((e.reason as Error)?.stack ?? e.reason)}`),
  );

  window.addEventListener("keydown", (e) => {
    if (!errors.length) return;
    // Toggle with Cmd/Ctrl+Shift+E.
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
      dismissed = !dismissed;
      render();
      return;
    }
    // Esc closes (only effective while recoverable; render() ignores dismiss when unrecoverable).
    if (e.key === "Escape" && document.getElementById(OVERLAY_ID)) {
      dismissed = true;
      render();
    }
  });
};
