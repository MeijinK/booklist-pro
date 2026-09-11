import { ApiError, type ApiErrorDetail } from "@/domain";
import type { MessageKey } from "@/i18n";

/**
 * Translates an application error into what to display.
 *
 * The brief requires 422 and 503 not to look alike on screen: one is fixed, the
 * other is waited out. The `kind` discriminant carries that difference, and
 * this function makes it visible to the bookseller.
 *
 * It returns catalogue keys rather than sentences: a plain function has no
 * access to the language, and hard-coding French here would put half the error
 * screens outside the bilingual interface.
 */

/** The server supplies its own wording for a refusal; it is shown as received. */
export type ErrorDetail = { key: MessageKey } | { text: string };

export type ErrorMessage = {
  titleKey: MessageKey;
  detail: ErrorDetail;
  /** False when retrying can change nothing: the button is then not offered. */
  retryable: boolean;
};

const UNEXPECTED: ErrorMessage = {
  titleKey: "error.unexpected.title",
  detail: { key: "error.unexpected.detail" },
  retryable: true,
};

export function errorMessage(error: unknown): ErrorMessage {
  if (!(error instanceof ApiError)) return UNEXPECTED;
  return fromDetail(error.detail);
}

function fromDetail(detail: ApiErrorDetail): ErrorMessage {
  switch (detail.kind) {
    case "network":
      return detail.status === undefined
        ? {
            titleKey: "error.offline.title",
            detail: { key: "error.offline.detail" },
            retryable: true,
          }
        : {
            titleKey: "error.unavailable.title",
            detail: { key: "error.unavailable.detail" },
            retryable: true,
          };

    case "validation":
      return {
        titleKey: "error.validation.title",
        detail: { text: detail.message },
        retryable: false,
      };

    case "conflict":
      return {
        titleKey: "error.conflict.title",
        detail: { key: "error.conflict.detail" },
        retryable: true,
      };

    case "auth":
      return {
        titleKey: "error.auth.title",
        detail: { text: detail.message },
        retryable: false,
      };

    case "notFound":
      return {
        titleKey: "error.notfound.title",
        detail: { key: "error.notfound.detail" },
        retryable: false,
      };
  }
}
