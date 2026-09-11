/**
 * Catalogue francais, et source de verite des cles.
 *
 * Les autres langues se typent contre lui : une traduction manquante ou une cle
 * inventee est refusee a la compilation, pas decouverte a l'ecran par un
 * libraire de la boutique frontaliere.
 *
 * Les cles decrivent l'endroit, jamais le texte. `record.delete.confirm` reste
 * juste le jour ou la phrase change ; `record.supprimer_definitivement` ne le
 * serait plus.
 *
 * Un texte porte `{nom}` la ou une valeur s'insere, et se decline en `.one` /
 * `.other` quand il s'accorde avec un nombre.
 */
export const fr = {
  "screen.list": "Le fonds",
  "screen.new": "Nouvel ouvrage",
  "screen.detail": "Fiche",
  "screen.edit": "Corriger la fiche",

  "appearance.label": "Apparence : {value}",
  "appearance.light": "Clair",
  "appearance.dark": "Sombre",
  "appearance.system": "Comme le poste",

  "language.label": "Langue : {value}",
  "language.fr": "Francais",
  "language.en": "English",
  "language.system": "Comme le poste",

  "search.label": "Rechercher un ouvrage par titre ou par auteur",
  "search.clear": "Effacer la recherche",
  "search.placeholder": "Titre ou auteur",

  "filter.state": "{name}, {state}",
  "filter.state.on": "actif",
  "filter.state.off": "inactif",
  "filter.status.all": "Tous",
  "filter.status.unread": "Non lus",
  "filter.status.read": "Lus",
  "filter.status.name": "Statut {label}",
  "filter.favourites": "Coups de coeur",
  "filter.favourites.name": "Coups de coeur uniquement",

  "sort.label": "Trier la liste. Actuellement : {summary}",
  "sort.summary": "{field}, {order}",
  "sort.field.titre": "Titre",
  "sort.field.auteur": "Auteur",
  "sort.field.annee": "Annee de publication",
  "sort.field.note": "Note de l'equipe",
  "sort.order.asc": "croissant",
  "sort.order.desc": "decroissant",
  "sort.order.item": "Ordre {order}",

  "list.add": "Ajouter",
  "list.loading": "Chargement du fonds",
  "list.more.loading": "Chargement de la suite",
  "list.more.one": "Charger 1 ouvrage de plus",
  "list.more.other": "Charger {count} ouvrages de plus",
  "list.counted.one": "1 ouvrage sur {total}",
  "list.counted.other": "{count} ouvrages sur {total}",

  "list.empty.title": "Le fonds est vide",
  "list.empty.description":
    "Aucun ouvrage n'a encore ete saisi pour cette boutique. Commencez par en ajouter un : le cahier se remplit ensuite tout seul.",
  "list.empty.action": "Ajouter un ouvrage",
  "list.filtered.title": "Aucun ouvrage dans cette selection",
  "list.filtered.description":
    "Le fonds de la boutique ne contient aucun ouvrage repondant a ces filtres. Elargissez la selection pour retrouver le reste du cahier.",
  "list.searched.title": "Aucun ouvrage ne porte ce titre",
  "list.searched.description":
    "Ni un titre ni un auteur du fonds ne contient « {search} ». Verifiez l'orthographe, ou cherchez sur moins de lettres.",
  "list.narrowed.action": "Afficher tout le fonds",

  "row.label": "{titre}, {auteur}",
  "row.label.read": "{titre}, {auteur}, lu",
  "row.read": "lu",

  "record.loading": "Chargement de la fiche",
  "record.gone.title": "Cette fiche n'existe plus",
  "record.gone.description": "Elle a sans doute ete supprimee depuis un autre poste de la boutique.",
  "record.gone.action": "Revenir au fonds",
  "record.edit": "Modifier la fiche",
  "record.delete": "Supprimer",
  "record.delete.title": "Supprimer cet ouvrage ?",
  "record.delete.body":
    "« {titre} » quittera le fonds de la boutique, ainsi que les notes de lecture qui lui sont rattachees. Vous disposerez de cinq secondes pour revenir en arriere.",
  "record.delete.keep": "Conserver",
  "record.delete.confirm": "Supprimer definitivement",
  "record.deleted": "« {titre} » a ete retire du fonds.",
  "record.undo": "Annuler",

  "field.editeur": "Editeur",
  "field.annee": "Annee de publication",
  "field.note": "Note de l'equipe",
  "field.updated": "Derniere modification",

  "toggle.read.name": "Statut de lecture",
  "toggle.read.on": "Lu",
  "toggle.read.off": "Non lu",
  "toggle.favourite.name": "Coup de coeur",
  "toggle.favourite.label": "Coup de coeur, {titre}",
  "toggle.refused": "Le serveur a refuse {action}. La fiche est revenue a son etat precedent.",
  "toggle.refused.favourite": "ce coup de coeur",
  "toggle.refused.status": "ce changement de statut",
  "toggle.refused.note": "cette note",

  "rating.group": "Note de l'equipe : {value}",
  "rating.unrated": "pas encore notee",
  "rating.value": "{value} sur {max}",
  "rating.star": "Noter {star} sur {max}",
  "rating.remove": "Retirer la note",

  "enrichment.caption": "Ailleurs dans les catalogues",
  "enrichment.editions.zero": "Aucune edition referencee",
  "enrichment.editions.one": "1 edition referencee",
  "enrichment.editions.other": "{count} editions referencees",
  "enrichment.year": "Premiere publication en {year}",
  "enrichment.source": "D'apres OpenLibrary",

  "form.titre": "Titre",
  "form.auteur": "Auteur",
  "form.editeur": "Editeur",
  "form.annee": "Annee de publication",
  "form.annee.hint": "Quatre chiffres, a partir de {min}.",
  "form.read.title": "Deja lu",
  "form.read.description": "L'equipe de la boutique a lu cet ouvrage.",
  "form.cancel": "Annuler",
  "form.submit.create": "Ajouter au fonds",
  "form.submit.edit": "Enregistrer les corrections",
  "form.gone.title": "Cette fiche n'existe plus",
  "form.gone.description":
    "Elle a ete supprimee depuis un autre poste. Rien de ce que vous saisiriez ici ne serait conserve.",

  "notes.list": "Notes de lecture",
  "notes.loading": "Chargement des notes de lecture",
  "notes.empty.title": "Aucune note pour cet ouvrage",
  "notes.empty.description":
    "Personne de l'equipe n'a encore ecrit dessus. La premiere note est celle qui servira au prochain conseil au comptoir.",
  "notes.compose.label": "Note de lecture",
  "notes.compose.placeholder": "Ecrire une note de lecture",
  "notes.remaining.one": "1 caractere restant",
  "notes.remaining.other": "{count} caracteres restants",
  "notes.sending": "Envoi en cours",
  "notes.delete": "Supprimer la note du {date}",

  "error.retry": "Reessayer",
  "error.unexpected.title": "Une erreur inattendue s'est produite",
  "error.unexpected.detail":
    "Reessayez ; si le probleme persiste, prevenez votre responsable reseau.",
  "error.offline.title": "Le serveur ne repond pas",
  "error.offline.detail": "Verifiez la connexion de la boutique, puis reessayez.",
  "error.unavailable.title": "Le service est momentanement indisponible",
  "error.unavailable.detail":
    "Le serveur a repondu, mais pas ce qui etait attendu. Reessayez dans un instant.",
  "error.validation.title": "La saisie a ete refusee",
  "error.conflict.title": "La fiche a ete modifiee entre temps",
  "error.conflict.detail":
    "Un collegue l'a enregistree avant vous. Rechargez-la avant de la corriger.",
  "error.auth.title": "Acces refuse",
  "error.notfound.title": "Cette fiche n'existe plus",
  "error.notfound.detail": "Elle a sans doute ete supprimee depuis un autre poste.",

  "boundary.title": "L'application s'est interrompue",
  "boundary.detail":
    "Aucune saisie en cours n'a ete envoyee. Revenez a la liste, puis reprenez ; si cela se reproduit, signalez-le avec ce qui etait affiche.",
  "boundary.action": "Revenir a la liste",
} as const;

export type MessageKey = keyof typeof fr;

/** Toute langue doit repondre exactement a ces cles, ni plus ni moins. */
export type Messages = Record<MessageKey, string>;
