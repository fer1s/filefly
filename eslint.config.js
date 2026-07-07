import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import i18next from "eslint-plugin-i18next";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "src-tauri/target", "src-tauri/gen"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      i18next.configs["flat/recommended"],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Route UI through the shared elements (Button, TextInput, Select, TextArea, Slider) so the
      // theme-aware look + a11y defaults live in one place. Bespoke fields use the element's
      // `unstyled` prop; genuinely element-less gaps (e.g. checkbox — no shared element yet) may
      // opt out with an inline eslint-disable + a comment saying why.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            "Use the shared <Button> element (pass `unstyled` for bespoke styling) instead of a raw <button>.",
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message:
            "Use a shared input element — <TextInput> (pass `unstyled`) or <Slider> — instead of a raw <input>.",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Use the shared <Select> element instead of a raw <select>.",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message:
            "Use the shared <TextArea> element instead of a raw <textarea>.",
        },
      ],
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          callees: {
            exclude: [
              "i18n(ext)?",
              "t",
              "classNames",
              "require",
              "addEventListener",
              "removeEventListener",
              "postMessage",
              "getElementById",
              "dispatch",
              "commit",
              "includes",
              "indexOf",
              "endsWith",
              "startsWith",
            ],
          },
        },
      ],
    },
  },
  {
    // The shared components ARE the primitive wrappers, so they legitimately render the raw
    // <button>/<input>/<select>/<textarea> that the rule above bans everywhere else.
    files: ["src/shared/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["*.{js,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },
]);
