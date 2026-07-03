import {
  FILE_KIND,
  DATE_RANGE,
  SIZE_BUCKET,
  type FileKind,
  type DateRange,
  type SizeBucket,
} from "@/shared/search/filters";

// Order the kinds/dates/sizes appear in the panel (keys into the i18n maps).
export const KIND_ORDER: FileKind[] = [
  FILE_KIND.FOLDER,
  FILE_KIND.IMAGE,
  FILE_KIND.VIDEO,
  FILE_KIND.AUDIO,
  FILE_KIND.DOCUMENT,
  FILE_KIND.OTHER,
];

export const DATE_ORDER: DateRange[] = [
  DATE_RANGE.ANY,
  DATE_RANGE.TODAY,
  DATE_RANGE.WEEK,
  DATE_RANGE.MONTH,
];

export const SIZE_ORDER: SizeBucket[] = [
  SIZE_BUCKET.ANY,
  SIZE_BUCKET.SMALL,
  SIZE_BUCKET.MEDIUM,
  SIZE_BUCKET.LARGE,
];

// Vertical gap (px) between the filter button and the panel it opens below it.
export const PANEL_GAP = 6;
