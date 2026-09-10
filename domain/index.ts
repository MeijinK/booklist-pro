export {
  BookDraftSchema,
  BookFormSchema,
  BookSchema,
  MIN_PUBLICATION_YEAR,
  maxPublicationYear,
  type Book,
  type BookDraft,
  type BookFormValues,
} from "./book";

export { NO_ENRICHMENT, type BookEnrichment } from "./enrichment";

export {
<<<<<<< HEAD
  NOTE_COUNTER_THRESHOLD, NOTE_MAX_LENGTH, NOTE_MAX_LENGTH,
=======
  NOTE_COUNTER_THRESHOLD,
  NOTE_MAX_LENGTH,
  NoteDraftSchema,
  NoteSchema,
  sortNotes,
  type Note,
>>>>>>> 9df3f42 (feat(domain): note validation rules and sort criteria)
  type NoteDraft,
} from "./note";

export {
  DEFAULT_LOCALE,
  DEFAULT_THEME_PREFERENCE,
  LOCALES,
  parseLocale,
  parseThemePreference,
  THEME_PREFERENCES,
  type Locale,
  type ThemePreference,
} from "./preferences";

export { DEFAULT_LIMIT, MAX_LIMIT, pageSchema, type Page } from "./page";

export {
  ApiError,
  ApiErrorBodySchema,
  AUTH_CODES,
  ConflictBodySchema,
  type ApiErrorDetail,
  type AuthCode,
  type AuthError,
  type ConflictError,
  type NetworkError,
  type NotFoundError,
  type ValidationError,
} from "./errors";

export {
  DEFAULT_FILTERS,
  normalizeFilters,
  READ_STATUSES,
  SORT_CHOICES,
  SORT_FIELDS,
  SORT_ORDERS,
  type BookFilters,
  type ReadStatus,
  type SortChoice,
  type SortField,
  type SortOrder,
} from "./filters";

