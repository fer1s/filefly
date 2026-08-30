import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import DialogActions from "@/shared/components/patterns/DialogActions";
import Button from "@/shared/components/elements/Button";
import Select from "@/shared/components/elements/Select";
import { renderMarkdown, openExternalUrl } from "@/shared/services/api";
import { RELEASES_URL } from "@/shared/services/updates";
import { t } from "@/lang";

import "@/styles/components/ChangelogDialog.css";

import { useChangelog } from "../../providers/ChangelogProvider";
import { changelogSource, CHANGELOG_TITLE_ID } from "../../constants";
import { parseChangelog } from "../../utils";

// "What's new": the bundled CHANGELOG.md, one release at a time, rendered through the same
// markdown renderer as the file preview. Lazy chunk (it carries the whole changelog text); the
// post-update detection runs eagerly in ChangelogDialogHost. Opens on the version the provider was asked for (the one
// just installed, from the post-update toast) or the newest entry; a dropdown browses older ones.
const ChangelogDialog = () => {
  const { visible, version, close } = useChangelog();

  const entries = useMemo(() => parseChangelog(changelogSource), []);
  const [selected, setSelected] = useState<string>(entries[0]?.version ?? "");

  // Re-aim at the requested version each time the dialog opens.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const wanted = entries.find((e) => e.version === version);
      setSelected((wanted ?? entries[0])?.version ?? "");
    }
  }

  const entry = entries.find((e) => e.version === selected) ?? entries[0];

  // Render lazily and cache per version (the backend renderer is an IPC round-trip).
  const [html, setHtml] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!visible || !entry || html[entry.version] !== undefined) return;
    let cancelled = false;
    renderMarkdown(entry.body)
      .then((rendered) => {
        if (!cancelled)
          setHtml((prev) => ({ ...prev, [entry.version]: rendered }));
      })
      .catch((err) => console.error("Failed to render changelog:\n" + err));
    return () => {
      cancelled = true;
    };
  }, [visible, entry, html]);

  const onSelect = (event: ChangeEvent<HTMLSelectElement>) =>
    setSelected(event.target.value);

  return (
    <Dialog
      visible={visible}
      title={t.changelog.title}
      onClose={close}
      className="changelog_modal"
    >
      <DialogHeader
        title={t.changelog.title}
        titleId={CHANGELOG_TITLE_ID}
        onClose={close}
      />
      <div className="changelog_body">
        <div className="changelog_toolbar">
          <h3 className="changelog_version">
            {entry ? t.changelog.version(entry.version) : ""}
          </h3>
          {entries.length > 1 && (
            <Select
              className="changelog_select"
              value={selected}
              onChange={onSelect}
              aria-label={t.changelog.pickVersion}
            >
              {entries.map((e) => (
                <option key={e.version} value={e.version}>
                  {t.changelog.version(e.version)}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div
          className="changelog_content markdown"
          // Rendered by the app's own markdown backend from the bundled CHANGELOG.md — not user
          // or remote content.
          dangerouslySetInnerHTML={{
            __html: entry ? (html[entry.version] ?? "") : "",
          }}
        />
        <DialogActions>
          <Button
            className="changelog_release"
            onClick={() => void openExternalUrl(RELEASES_URL)}
          >
            {t.changelog.viewOnGitHub}
          </Button>
          <Button className="changelog_close" onClick={close}>
            {t.common.close}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
};

export default ChangelogDialog;
