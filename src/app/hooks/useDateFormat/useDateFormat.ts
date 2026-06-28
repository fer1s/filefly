import { useCallback, useState } from "react";

import { DEFAULT_DATE_FORMAT } from "@/shared/constants";

import { DATE_FORMAT_STORAGE_KEY } from "./constants";

// The user's chosen date format, persisted across launches. The value is either a token pattern
// (YYYY-MM-DD HH:mm, …) or the DATE_FORMAT_LOCALE sentinel; formatDate interprets it.
export const useDateFormat = () => {
  const [dateFormat, setDateFormatState] = useState<string>(
    () => localStorage.getItem(DATE_FORMAT_STORAGE_KEY) ?? DEFAULT_DATE_FORMAT,
  );

  const setDateFormat = useCallback((value: string) => {
    setDateFormatState(value);
    localStorage.setItem(DATE_FORMAT_STORAGE_KEY, value);
  }, []);

  return { dateFormat, setDateFormat };
};
