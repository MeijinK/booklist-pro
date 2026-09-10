import {
  BookSchema,
  pageSchema,
  type Book,
  type BookDraft,
  type BookFilters,
  type Page,
} from "@/domain";

import { request, requestNoContent } from "./client";

const BookPageSchema = pageSchema(BookSchema);

/** Fields a PATCH can change, where PUT requires the full representation. */
export type BookPatch = Partial<
  Pick<Book, "titre" | "auteur" | "editeur" | "annee" | "lu" | "favori" | "note">
>;

/**
 * Builds the GET /books query string.
 * A missing or empty filter is not sent: the server then applies its own
 * default, and two equivalent calls produce the same URL.
 */
function buildQuery(filters: BookFilters): string {
  const params = new URLSearchParams();

  const add = (key: string, value: string | number | boolean | undefined) => {
    if (value === undefined) return;
    const text = String(value).trim();
    if (text !== "") params.set(key, text);
  };

  add("page", filters.page);
  add("limit", filters.limit);
  add("q", filters.q);
  add("status", filters.status);
  add("favori", filters.favori);
  add("auteur", filters.auteur);
  add("sort", filters.sort);
  add("order", filters.order);

  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/** The server filters, sorts and paginates. None of that is redone here. */
export function listBooks(filters: BookFilters = {}, signal?: AbortSignal): Promise<Page<Book>> {
  return request(`/books${buildQuery(filters)}`, { schema: BookPageSchema, signal });
}

export function getBook(id: string, signal?: AbortSignal): Promise<Book> {
  return request(`/books/${encodeURIComponent(id)}`, { schema: BookSchema, signal });
}

export function createBook(draft: BookDraft): Promise<Book> {
  return request("/books", { method: "POST", body: draft, schema: BookSchema });
}

/**
 * Full replacement. `version` goes out in the If-Match header: if the record
 * changed in the meantime, the server answers 409 and the client gets a
 * ConflictError carrying the server version, instead of overwriting a
 * colleague's work.
 */
export function replaceBook(id: string, draft: BookDraft, version: number): Promise<Book> {
  return request(`/books/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: draft,
    schema: BookSchema,
    headers: { "If-Match": String(version) },
  });
}

/** Partial update: toggling `lu` or `favori` without resending the whole record. */
export function patchBook(id: string, changes: BookPatch, version?: number): Promise<Book> {
  return request(`/books/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
    schema: BookSchema,
    headers: version === undefined ? undefined : { "If-Match": String(version) },
  });
}

/** The server does not check the version on this route: no If-Match. */
export function deleteBook(id: string): Promise<void> {
  return requestNoContent(`/books/${encodeURIComponent(id)}`, { method: "DELETE" });
}
