import type { SortKey } from "@/shared/constants";
import type { Sort } from "../../sort";

export type ListHeaderProps = {
  sort: Sort;
  onSort: (key: SortKey) => void;
};
