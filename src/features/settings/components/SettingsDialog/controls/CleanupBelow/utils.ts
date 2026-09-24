import { CLEANUP_ERROR } from "@/shared/constants";
import { t } from "@/lang";

// Map a cleanup command's rejection to display copy. The backend returns stable CLEANUP_ERROR codes
// (never prose) so the message lives in the translation dictionary; anything else is a raw OS/Tauri
// error and is surfaced verbatim inside the generic wrapper.
export const cleanupErrorMessage = (error: unknown): string => {
  switch (String(error)) {
    case CLEANUP_ERROR.NOT_ABSOLUTE:
      return t.settings.cleanupErrorNotAbsolute;
    case CLEANUP_ERROR.NOT_A_DIR:
      return t.settings.cleanupErrorNotADir;
    case CLEANUP_ERROR.PROTECTED_PATH:
      return t.settings.cleanupErrorProtected;
    case CLEANUP_ERROR.DUPLICATE:
      return t.settings.cleanupErrorDuplicate;
    case CLEANUP_ERROR.UNKNOWN_TARGET:
      return t.settings.cleanupErrorUnknownTarget;
    case CLEANUP_ERROR.INVALID_MODE:
      return t.settings.cleanupErrorInvalidMode;
    default:
      return t.settings.cleanupError(String(error));
  }
};
