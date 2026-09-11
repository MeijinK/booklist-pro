export {
  BookDraftSchema,
  BookFormSchema,
  BookSchema, maxPublicationYear, MIN_PUBLICATION_YEAR, type Book,
  type BookDraft,
  type BookFormValues
} from "./book";

export { NO_ENRICHMENT, type BookEnrichment } from "./enrichment";

export {
  NOTE_COUNTER_THRESHOLD,
  NOTE_MAX_LENGTH,
  NoteDraftSchema,
  NoteSchema,
  sortNotes,
  type Note,
  type NoteDraft
} from "./note";

export {
  DEFAULT_LOCALE,
  DEFAULT_THEME_PREFERENCE,
  LOCALES,
  parseLocale,
  parseThemePreference,
  THEME_PREFERENCES,
  type Locale,
  type ThemePreference
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
  type ValidationError
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
  type SortOrder
} from "./filters";

export {
  ConnexionSchema,
  peutEcrire,
  ROLE_LABELS,
  ROLES,
  RoleSchema,
  UtilisateurSchema,
  type ConnexionValues,
  type Role,
  type Utilisateur
} from "./utilisateur";

export { retourSur, type RaisonDeconnexion } from "./session";
