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

/** Champs modifiables par un PATCH, la ou PUT exige la representation complete. */
export type BookPatch = Partial<
  Pick<Book, "titre" | "auteur" | "editeur" | "annee" | "lu" | "favori" | "note">
>;

/**
 * Construit la chaine de requete de GET /books.
 * Un filtre absent ou vide n'est pas envoye : le serveur applique alors son
 * propre defaut, et deux appels equivalents produisent la meme URL.
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

/** Le serveur filtre, trie et pagine. Rien de tout cela ne se refait ici. */
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
 * Remplacement complet. `version` part en en-tete If-Match : si la fiche a
 * change entre temps, le serveur repond 409 et le client obtient un
 * ConflictError porteur de la version serveur, au lieu d'ecraser le travail
 * d'un collegue.
 */
export function replaceBook(id: string, draft: BookDraft, version: number): Promise<Book> {
  return request(`/books/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: draft,
    schema: BookSchema,
    headers: { "If-Match": String(version) },
  });
}

/** Modification partielle : basculer `lu` ou `favori` sans renvoyer la fiche entiere. */
export function patchBook(id: string, changes: BookPatch, version?: number): Promise<Book> {
  return request(`/books/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
    schema: BookSchema,
    headers: version === undefined ? undefined : { "If-Match": String(version) },
  });
}

/** Le serveur ne controle pas la version sur cette route : pas d'If-Match. */
export function deleteBook(id: string): Promise<void> {
  return requestNoContent(`/books/${encodeURIComponent(id)}`, { method: "DELETE" });
}
