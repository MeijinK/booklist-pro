/**
 * Catalogue français, et source de vérité des clés.
 *
 * Les autres langues se typent contre lui : une traduction manquante ou une clé
 * inventée est refusée à la compilation, pas découverte à l'écran par un
 * libraire de la boutique frontalière.
 *
 * Les clés décrivent l'endroit, jamais le texte. `record.delete.confirm` reste
 * juste le jour où la phrase change ; `record.supprimer_definitivement` ne le
 * serait plus.
 *
 * Un texte porte `{nom}` là où une valeur s'insère, et se décline en `.one` /
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
  "language.fr": "Français",
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
  "filter.favourites": "Coups de cœur",
  "filter.favourites.name": "Coups de cœur uniquement",

  "sort.label": "Trier la liste. Actuellement : {summary}",
  "sort.summary": "{field}, {order}",
  "sort.field.titre": "Titre",
  "sort.field.auteur": "Auteur",
  "sort.field.annee": "Année de publication",
  "sort.field.note": "Note de l'équipe",
  "sort.order.asc": "croissant",
  "sort.order.desc": "décroissant",
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
    "Aucun ouvrage n'a encore été saisi pour cette boutique. Commencez par en ajouter un : le cahier se remplit ensuite tout seul.",
  "list.empty.action": "Ajouter un ouvrage",
  "list.filtered.title": "Aucun ouvrage dans cette sélection",
  "list.filtered.description":
    "Le fonds de la boutique ne contient aucun ouvrage répondant à ces filtres. Élargissez la sélection pour retrouver le reste du cahier.",
  "list.searched.title": "Aucun ouvrage ne porte ce titre",
  "list.searched.description":
    "Ni un titre ni un auteur du fonds ne contient « {search} ». Vérifiez l'orthographe, ou cherchez sur moins de lettres.",
  "list.narrowed.action": "Afficher tout le fonds",

  "row.label": "{titre}, {auteur}",
  "row.label.read": "{titre}, {auteur}, lu",
  "row.read": "lu",

  "record.loading": "Chargement de la fiche",
  "record.gone.title": "Cette fiche n'existe plus",
  "record.gone.description": "Elle a sans doute été supprimée depuis un autre poste de la boutique.",
  "record.gone.action": "Revenir au fonds",
  "record.edit": "Modifier la fiche",
  "record.delete": "Supprimer",
  "record.delete.title": "Supprimer cet ouvrage ?",
  "record.delete.body":
    "« {titre} » quittera le fonds de la boutique, ainsi que les notes de lecture qui lui sont rattachées. Vous disposerez de cinq secondes pour revenir en arrière.",
  "record.delete.keep": "Conserver",
  "record.delete.confirm": "Supprimer définitivement",
  "record.deleted": "« {titre} » a été retiré du fonds.",
  "record.undo": "Annuler",

  "field.editeur": "Éditeur",
  "field.annee": "Année de publication",
  "field.note": "Note de l'équipe",
  "field.updated": "Dernière modification",

  "toggle.read.name": "Statut de lecture",
  "toggle.read.on": "Lu",
  "toggle.read.off": "Non lu",
  "toggle.favourite.name": "Coup de cœur",
  "toggle.favourite.label": "Coup de cœur, {titre}",
  "toggle.refused": "Le serveur a refusé {action}. La fiche est revenue à son état précédent.",
  "toggle.refused.favourite": "ce coup de cœur",
  "toggle.refused.status": "ce changement de statut",
  "toggle.refused.note": "cette note",

  "rating.group": "Note de l'équipe : {value}",
  "rating.unrated": "pas encore notée",
  "rating.value": "{value} sur {max}",
  "rating.star": "Noter {star} sur {max}",
  "rating.remove": "Retirer la note",

  "enrichment.caption": "Ailleurs dans les catalogues",
  "enrichment.editions.zero": "Aucune édition référencée",
  "enrichment.editions.one": "1 édition référencée",
  "enrichment.editions.other": "{count} éditions référencées",
  "enrichment.year": "Première publication en {year}",
  "enrichment.source": "D'après OpenLibrary",

  "form.titre": "Titre",
  "form.auteur": "Auteur",
  "form.editeur": "Éditeur",
  "form.annee": "Année de publication",
  "form.annee.hint": "Quatre chiffres, à partir de {min}.",
  "form.read.title": "Déjà lu",
  "form.read.description": "L'équipe de la boutique a lu cet ouvrage.",
  "form.cancel": "Annuler",
  "form.submit.create": "Ajouter au fonds",
  "form.submit.edit": "Enregistrer les corrections",
  "form.gone.title": "Cette fiche n'existe plus",
  "form.gone.description":
    "Elle a été supprimée depuis un autre poste. Rien de ce que vous saisiriez ici ne serait conservé.",

  "notes.list": "Notes de lecture",
  "notes.loading": "Chargement des notes de lecture",
  "notes.empty.title": "Aucune note pour cet ouvrage",
  "notes.empty.description":
    "Personne de l'équipe n'a encore écrit dessus. La première note est celle qui servira au prochain conseil au comptoir.",
  "notes.compose.label": "Note de lecture",
  "notes.compose.placeholder": "Écrire une note de lecture",
  "notes.remaining.one": "1 caractère restant",
  "notes.remaining.other": "{count} caractères restants",
  "notes.sending": "Envoi en cours",
  "notes.delete": "Supprimer la note du {date}",

  "error.retry": "Réessayer",
  "error.unexpected.title": "Une erreur inattendue s'est produite",
  "error.unexpected.detail":
    "Réessayez ; si le problème persiste, prévenez votre responsable réseau.",
  "error.offline.title": "Le serveur ne répond pas",
  "error.offline.detail": "Vérifiez la connexion de la boutique, puis réessayez.",
  "error.unavailable.title": "Le service est momentanément indisponible",
  "error.unavailable.detail":
    "Le serveur a répondu, mais pas ce qui était attendu. Réessayez dans un instant.",
  "error.validation.title": "La saisie a été refusée",
  "error.conflict.title": "La fiche a été modifiée entre temps",
  "error.conflict.detail":
    "Un collègue l'a enregistrée avant vous. Rechargez-la avant de la corriger.",
  "error.auth.title": "Accès refusé",
  "error.notfound.title": "Cette fiche n'existe plus",
  "error.notfound.detail": "Elle a sans doute été supprimée depuis un autre poste.",

  "boundary.title": "L'application s'est interrompue",
  "boundary.detail":
    "Aucune saisie en cours n'a été envoyée. Revenez à la liste, puis reprenez ; si cela se reproduit, signalez-le avec ce qui était affiché.",
  "boundary.action": "Revenir à la liste",
} as const;

export type MessageKey = keyof typeof fr;

/** Toute langue doit répondre exactement à ces clés, ni plus ni moins. */
export type Messages = Record<MessageKey, string>;
