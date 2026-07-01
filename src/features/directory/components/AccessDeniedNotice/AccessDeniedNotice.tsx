import { useStateContext } from "@/shared/providers/StateProvider";
import Icon from "@/shared/components/elements/Icon";
import Button from "@/shared/components/elements/Button";
import { t } from "@/lang";

import { faLock } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/AccessDeniedNotice.css";

// Shown when the current directory can't be read because the OS gates it behind a privacy
// permission (macOS Full Disk Access, e.g. the Trash). Offers a shortcut to the settings pane.
const AccessDeniedNotice = () => {
  const { fs } = useStateContext();

  return (
    <div className="AccessDeniedNotice">
      <Icon icon={faLock} className="access_denied_icon" />
      <h2 className="access_denied_title">{t.directory.accessDenied.title}</h2>
      <p className="access_denied_description">
        {t.directory.accessDenied.description}
      </p>
      <Button onClick={() => fs.openFullDiskAccessSettings()}>
        {t.directory.accessDenied.grant}
      </Button>
      <p className="access_denied_hint">{t.directory.accessDenied.hint}</p>
    </div>
  );
};

export default AccessDeniedNotice;
