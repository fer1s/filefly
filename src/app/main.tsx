import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { config } from "@fortawesome/fontawesome-svg-core";
import App from "./App";
import PreviewWindow from "@/features/directory/components/Preview/PreviewWindow";
import PropertiesWindow from "@/features/directory/components/Properties/PropertiesWindow";

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

// A `panel` query param marks a detached panel window (see window::create_preview_window /
// create_properties_window): it renders only that surface for the file in `path` instead of the
// full browser. Everything else is a normal browser window.
const params = new URLSearchParams(window.location.search);
const panel = params.get("panel");
const panelTarget = params.get("path") ?? "";

const panelApp =
  panel === "preview" ? (
    <PreviewWindow target={panelTarget} />
  ) : panel === "properties" ? (
    <PropertiesWindow target={panelTarget} />
  ) : null;

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    {panelApp ?? (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>,
);
