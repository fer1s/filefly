import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SearchBar.css";

const SearchBar = () => {
  const { search, setSearch } = useStateContext();

  return (
    <div className="SearchBar">
      <input
        type="text"
        placeholder={t.sidebar.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && (
        <IconButton
          icon={faXmark}
          className="clear"
          onClick={() => setSearch("")}
          aria-label={t.sidebar.clearSearch}
        />
      )}
    </div>
  );
};

export default SearchBar;
