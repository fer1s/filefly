import Popup from "@/shared/components/patterns/Popup";
import { ENTRY_KIND } from "@/shared/constants";
import { t } from "@/lang";

import type { DetailsPopupProps } from "./types";

// Hover popup showing the type, (truncated) path and extension of the highlighted entry.
const DetailsPopup = ({ visible, id, type }: DetailsPopupProps) => (
  <Popup visible={visible} title={t.details.title}>
    <h3>
      {t.details.type}{" "}
      <span>
        {type === ENTRY_KIND.DIRECTORY
          ? t.common.directory
          : type === ENTRY_KIND.FILE
            ? t.common.file
            : t.common.unknown}
      </span>
    </h3>
    <h3>
      {t.details.path}{" "}
      <span>
        {id.length > 40 ? `${id.slice(0, 40)}...` : id || t.common.unknown}
      </span>
    </h3>
    {type === ENTRY_KIND.FILE && (
      <h3>
        {t.details.extension}{" "}
        <span>{id.split(".").pop() || t.common.unknown}</span>
      </h3>
    )}
  </Popup>
);

export default DetailsPopup;
