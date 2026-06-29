import { useStateContext } from "@/shared/providers/StateProvider";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";

import TabItem from "./components/TabItem";

import "@/styles/components/TabBar.css";

// Browser-style tab strip above the PathBar. Each tab carries its own navigation history. Only
// shown when more than one tab is open; the "new tab" button lives in the sidebar header and the
// tab keyboard shortcuts are wired app-wide (see useTabsShortcuts in AppContent).
const TabBar = () => {
  const { tabs, activeTabId, closeTab, selectTab } = useStateContext();
  const { keymap } = useKeymap();

  const closable = tabs.length > 1;
  const closeHotkey = formatBinding(keymap[KEYMAP_ACTION.CLOSE_TAB]);

  return (
    <div className="TabBar" role="tablist">
      <div className="tab_strip">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            closable={closable}
            closeHotkey={closeHotkey}
            onSelect={selectTab}
            onClose={closeTab}
          />
        ))}
      </div>
    </div>
  );
};

export default TabBar;
