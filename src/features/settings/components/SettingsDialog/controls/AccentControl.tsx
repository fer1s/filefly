import type { CSSProperties } from "react";

import Button from "@/shared/components/elements/Button";
import { classNames } from "@/shared/utils";
import { ACCENTS } from "@/shared/constants";
import { t } from "@/lang";

import type { CustomControlProps } from "../../../schema";

// Accent picker: a row of colour swatches. Selecting one writes accentColor immediately, so the
// whole app recolours live (useAccent flips data-accent on <html>) — the running UI *is* the
// preview. The active swatch carries a ring; the CSS derives each swatch fill from its --swatch
// RGB triple (mirrors theme.css) so the dots match the live tokens.
const AccentControl = ({ settings, update }: CustomControlProps) => (
  <div
    className="settings_accents"
    role="radiogroup"
    aria-label={t.settings.accent}
  >
    {ACCENTS.map(({ value, rgb }) => {
      const active = settings.accentColor === value;
      const name = t.settings.accents[value];
      return (
        <Button
          key={value}
          unstyled
          // eslint-disable-next-line i18next/no-literal-string -- ARIA role, not user-facing copy
          role="radio"
          aria-checked={active}
          aria-label={name}
          title={name}
          className={classNames("settings_accent", active && "active")}
          style={{ "--swatch": rgb } as CSSProperties}
          onClick={() => update({ accentColor: value })}
        />
      );
    })}
  </div>
);

export default AccentControl;
