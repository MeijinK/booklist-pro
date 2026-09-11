import type { Messages } from "./fr";

/**
 * English catalogue.
 *
 * Typed as `Messages`, so a missing or invented key fails to compile. Two shops
 * of the network sit on a border: a bookseller switching language must not land
 * on a half-translated screen.
 */
export const en: Messages = {
  "screen.list": "The collection",
  "screen.new": "New book",
  "screen.detail": "Record",
  "screen.edit": "Correct the record",

  "appearance.label": "Appearance: {value}",
  "appearance.light": "Light",
  "appearance.dark": "Dark",
  "appearance.system": "Match the workstation",

  "language.label": "Language: {value}",
  "language.fr": "Français",
  "language.en": "English",
  "language.system": "Match the workstation",

  "search.label": "Search a book by title or author",
  "search.clear": "Clear the search",
  "search.placeholder": "Title or author",

  "filter.state": "{name}, {state}",
  "filter.state.on": "on",
  "filter.state.off": "off",
  "filter.status.all": "All",
  "filter.status.unread": "Unread",
  "filter.status.read": "Read",
  "filter.status.name": "Status {label}",
  "filter.favourites": "Staff picks",
  "filter.favourites.name": "Staff picks only",

  "sort.label": "Sort the list. Currently: {summary}",
  "sort.summary": "{field}, {order}",
  "sort.field.titre": "Title",
  "sort.field.auteur": "Author",
  "sort.field.annee": "Year of publication",
  "sort.field.note": "Team rating",
  "sort.order.asc": "ascending",
  "sort.order.desc": "descending",
  "sort.order.item": "{order} order",

  "list.add": "Add",
  "list.loading": "Loading the collection",
  "list.more.loading": "Loading more",
  "list.more.one": "Load 1 more book",
  "list.more.other": "Load {count} more books",
  "list.counted.one": "1 book out of {total}",
  "list.counted.other": "{count} books out of {total}",
  "list.end": "End of the collection",

  "list.empty.title": "The collection is empty",
  "list.empty.description":
    "No book has been entered for this shop yet. Start by adding one: the ledger fills up on its own afterwards.",
  "list.empty.action": "Add a book",
  "list.filtered.title": "No book in this selection",
  "list.filtered.description":
    "The shop's collection holds no book matching these filters. Widen the selection to find the rest of the ledger.",
  "list.searched.title": "No book bears that title",
  "list.searched.description":
    "No title and no author in the collection contains “{search}”. Check the spelling, or search on fewer letters.",
  "list.narrowed.action": "Show the whole collection",

  "row.label": "{titre}, {auteur}",
  "row.label.read": "{titre}, {auteur}, read",
  "row.read": "read",

  "record.loading": "Loading the record",
  "record.gone.title": "This record no longer exists",
  "record.gone.description": "It was most likely deleted from another workstation in the shop.",
  "record.gone.action": "Back to the collection",
  "record.edit": "Correct the record",
  "record.delete": "Delete",
  "record.delete.title": "Delete this book?",
  "record.delete.body":
    "“{titre}” will leave the shop's collection, along with the reading notes attached to it. You will have five seconds to go back.",
  "record.delete.keep": "Keep",
  "record.delete.confirm": "Delete permanently",
  "record.deleted": "“{titre}” has been removed from the collection.",
  "record.undo": "Undo",

  "field.editeur": "Publisher",
  "field.annee": "Year of publication",
  "field.note": "Team rating",
  "field.updated": "Last modified",

  "toggle.read.name": "Reading status",
  "toggle.read.on": "Read",
  "toggle.read.off": "Unread",
  "toggle.favourite.name": "Staff pick",
  "toggle.favourite.label": "Staff pick, {titre}",
  "toggle.refused": "The server refused {action}. The record is back to its previous state.",
  "toggle.refused.favourite": "this staff pick",
  "toggle.refused.status": "this change of status",
  "toggle.refused.note": "this rating",

  "rating.group": "Team rating: {value}",
  "rating.unrated": "not rated yet",
  "rating.value": "{value} out of {max}",
  "rating.star": "Rate {star} out of {max}",
  "rating.remove": "Remove the rating",

  "enrichment.caption": "Elsewhere in the catalogues",
  "enrichment.editions.zero": "No edition on record",
  "enrichment.editions.one": "1 edition on record",
  "enrichment.editions.other": "{count} editions on record",
  "enrichment.year": "First published in {year}",
  "enrichment.source": "According to OpenLibrary",

  "form.titre": "Title",
  "form.auteur": "Author",
  "form.editeur": "Publisher",
  "form.annee": "Year of publication",
  "form.annee.hint": "Four digits, from {min} onwards.",
  "form.read.title": "Already read",
  "form.read.description": "The shop's team has read this book.",
  "form.cancel": "Cancel",
  "form.submit.create": "Add to the collection",
  "form.submit.edit": "Save the corrections",
  "form.gone.title": "This record no longer exists",
  "form.gone.description":
    "It was deleted from another workstation. Nothing you enter here would be kept.",

  "notes.list": "Reading notes",
  "notes.count.none": "none",
  "notes.loading": "Loading the reading notes",
  "notes.empty.title": "No note for this book",
  "notes.empty.description":
    "Nobody on the team has written about it yet. The first note is the one that will serve the next recommendation at the counter.",
  "notes.compose.label": "Reading note",
  "notes.compose.placeholder": "Write a reading note",
  "notes.compose.submit": "Add the note",
  "notes.remaining.one": "1 character left",
  "notes.remaining.other": "{count} characters left",
  "notes.sending": "Sending",
  "datetime.at": "at",
  "notes.delete": "Delete the note from {date}",
  "notes.delete.question": "Remove this note from the ledger?",
  "notes.delete.keep": "Keep",
  "notes.delete.confirm": "Remove",

  "error.retry": "Try again",
  "error.unexpected.title": "An unexpected error occurred",
  "error.unexpected.detail":
    "Try again; if the problem persists, tell your network manager.",
  "error.offline.title": "The server is not answering",
  "error.offline.detail": "Check the shop's connection, then try again.",
  "error.unavailable.title": "The service is momentarily unavailable",
  "error.unavailable.detail":
    "The server answered, but not with what was expected. Try again in a moment.",
  "error.validation.title": "The entry was refused",
  "error.conflict.title": "The record was modified in the meantime",
  "error.conflict.detail":
    "A colleague saved it before you. Reload it before correcting it.",
  "error.auth.title": "Access refused",
  "error.forbidden.title": "Reserved for senior booksellers",
  "error.forbidden.detail":
    "Your account is read-only. Ask a senior bookseller to make this change.",
  "error.credentials.title": "Sign-in refused",
  "error.credentials.detail": "Wrong email or password.",
  "error.session.title": "Your session is no longer valid",
  "error.session.detail": "Sign in again to carry on.",
  "error.notfound.title": "This record no longer exists",
  "error.notfound.detail": "It was most likely deleted from another workstation.",

  "boundary.title": "The application stopped",
  "boundary.detail":
    "Nothing you were entering has been sent. Go back to the list and carry on; if this happens again, report it along with what was on screen.",
  "boundary.action": "Back to the list",
};
