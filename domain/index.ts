export {
  BookDraftSchema,
  BookSchema,
  MIN_PUBLICATION_YEAR,
  maxPublicationYear,
  SaisieLivreSchema,
  type Book,
  type BookDraft,
  type SaisieLivre,
} from "./livre";

export { NOTE_MAX_LENGTH, NoteSchema, type Note } from "./note";

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
} from "./erreurs";

export {
  DEFAULT_FILTERS,
  normalizeFilters,
  READ_STATUSES,
  SORT_FIELDS,
  SORT_ORDERS,
  type BookFilters,
  type ReadStatus,
  type SortField,
  type SortOrder,
} from "./filtres";
