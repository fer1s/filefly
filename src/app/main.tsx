import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { config } from "@fortawesome/fontawesome-svg-core";
import App from "./App";
import PreviewWindow from "@/features/directory/components/Preview/PreviewWindow";

// FontAwesome injects its sizing CSS at runtime by default. The production CSP
// (default-src 'self', no inline styles) blocks that injection, so icons render
// huge/unstyled. Import the stylesheet statically and disable the runtime inject
// so the rules ship in the bundle instead.
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

import "@/styles/theme.css";
import "@/styles/index.css";

import { installDevErrorOverlay } from "./devErrorOverlay";

// Dev-only full-screen error overlay (see devErrorOverlay); no-op in production builds.
installDevErrorOverlay();

// A `panel=preview` query param marks a detached preview window (see window::create_preview_window);
// it renders only the Preview surface for the file in `path` instead of the full browser.
// Everything else is a normal browser window.
const params = new URLSearchParams(window.location.search);
const panel = params.get("panel");
const previewTarget = params.get("path") ?? "";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    {panel === "preview" ? (
      <PreviewWindow target={previewTarget} />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>,
);
