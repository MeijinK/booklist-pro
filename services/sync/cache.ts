import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { Book, Note, Page } from "@/domain";
import { bookKeys, noteKeys } from "@/services/queryKeys";

type ListData = InfiniteData<Page<Book>>;

/**
 * Optimistic writes, in one place. The queue says what the bookseller meant;
 * these functions make the screen say it too, before any round trip, and keep
 * the lists and the record in agreement.
 *
 * A page that does not hold the book keeps its reference: the rows it renders
 * are then skipped by React.memo instead of being redrawn.
 */
function surListes(qc: QueryClient, f: (items: Book[]) => Book[] | null): void {
  qc.setQueriesData<ListData>({ queryKey: bookKeys.lists() }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page) => {
            const items = f(page.items);
            return items === null ? page : { ...page, items };
          }),
        },
  );
}

function contient(items: Book[], id: string): boolean {
  return items.some((b) => b.id === id);
}

export function ecrireLivre(qc: QueryClient, id: string, update: (b: Book) => Book): void {
  surListes(qc, (items) =>
    contient(items, id) ? items.map((b) => (b.id === id ? update(b) : b)) : null,
  );
  qc.setQueryData<Book>(bookKeys.detail(id), (b) => (b === undefined ? b : update(b)));
}

/** A record as the server just returned it: replaces whatever the cache held. */
export function ecrireLivreServeur(qc: QueryClient, livre: Book): void {
  surListes(qc, (items) =>
    contient(items, livre.id) ? items.map((b) => (b.id === livre.id ? livre : b)) : null,
  );
  qc.setQueryData<Book>(bookKeys.detail(livre.id), livre);
}

export function insererLivre(qc: QueryClient, livre: Book): void {
  qc.setQueriesData<ListData>({ queryKey: bookKeys.lists() }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page, index) =>
            index === 0 && !contient(page.items, livre.id)
              ? { ...page, items: [livre, ...page.items], total: page.total + 1 }
              : page,
          ),
        },
  );
  qc.setQueryData<Book>(bookKeys.detail(livre.id), livre);
}

export function retirerLivre(qc: QueryClient, id: string): void {
  surListes(qc, (items) => (contient(items, id) ? items.filter((b) => b.id !== id) : null));
  qc.removeQueries({ queryKey: bookKeys.detail(id) });
}

/** The server has named a book created offline: same row, real identity. */
export function renommerLivre(qc: QueryClient, local: string, livre: Book): void {
  surListes(qc, (items) =>
    contient(items, local) ? items.map((b) => (b.id === local ? livre : b)) : null,
  );
  qc.setQueryData<Book>(bookKeys.detail(livre.id), livre);

  const notes = qc.getQueryData<Note[]>(noteKeys.all(local));
  if (notes !== undefined) {
    qc.setQueryData<Note[]>(
      noteKeys.all(livre.id),
      notes.map((n) => ({ ...n, livreId: livre.id })),
    );
  }
  // Drops the local record and, through the key hierarchy, its notes: they
  // were copied under the real id just above.
  qc.removeQueries({ queryKey: bookKeys.detail(local) });
}

export function insererNote(qc: QueryClient, livreId: string, note: Note): void {
  qc.setQueryData<Note[]>(noteKeys.all(livreId), (notes) => [note, ...(notes ?? [])]);
}

export function remplacerNote(qc: QueryClient, livreId: string, idLocal: string, note: Note): void {
  qc.setQueryData<Note[]>(noteKeys.all(livreId), (notes) => {
    const sans = (notes ?? []).filter((n) => n.id !== idLocal);
    return sans.some((n) => n.id === note.id) ? sans : [note, ...sans];
  });
}
