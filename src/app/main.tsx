import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { config } from "@fortawesome/fontawesome-svg-core";
import App from "./App";

// FontAwesome injects its sizing CSS at runtime by default. The production CSP
// (default-src 'self', no inline styles) blocks that injection, so icons render
// huge/unstyled. Import the stylesheet statically and disable the runtime inject
// so the rules ship in the bundle instead.
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

import "@/styles/theme.css";
import "@/styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
