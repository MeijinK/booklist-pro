# PRODUCT.md — BookList Pro

register: product

## Product Purpose

Le cahier de lecture des Comptoirs du Livre, reseau de dix-sept librairies
independantes. Aujourd'hui un cahier papier : illisible, jamais a jour, perdu
des qu'un libraire change de boutique. BookList Pro le remplace.

Ce n'est pas un catalogue. Le fonds (500 ouvrages) est le support ; la valeur
est ce que l'equipe en dit — statut de lecture, notes, coups de coeur. C'est
l'outil de vente le plus precieux du reseau.

## Users

| Profil | Ce qu'il fait | Ce que ca implique |
| --- | --- | --- |
| Libraire titulaire | Ajoute, modifie, note les ouvrages ; redige les notes de lecture | Droits d'ecriture complets |
| Libraire saisonnier | Consulte le fonds et les notes pour conseiller un client | Lecture seule |
| Responsable reseau | Consulte les statistiques de lecture du reseau | Tableau de bord chiffre |

## Scene d'usage

Un libraire titulaire, debout au poste de caisse, entre deux clients. Lumiere
du jour par la vitrine plus spots chauds au plafond. Ecran partage avec le
logiciel de caisse. Il tape trois lettres d'un titre pendant qu'un client
attend, et doit lire la reponse d'un coup d'oeil, de biais, sans se pencher.

Cette scene tranche le theme : **clair**. Un fond sombre sur une vitrine
ensoleillee devient un miroir.

## Contraintes du terrain

- Boutiques mal connectees : l'API repond parfois en deux secondes, parfois pas.
- Travail hors ligne : inventaire en reserve, salons du livre sans couverture.
- Plusieurs personnes modifient les memes fiches. Les conflits sont certains.
- Postes heterogenes. **Cible n°1 : le navigateur** sur les postes de caisse.
- **La saisie d'un libraire ne se perd jamais.** Regle n°1 du cahier des charges.

## Principes strategiques

1. **Le doute coute plus cher que l'erreur.** Une action destructrice se
   rattrape (annulation cinq secondes) plutot qu'elle ne se confirme deux fois.
2. **Toujours dire ce qui se passe.** Quatre etats sur chaque ecran de donnees :
   squelette, erreur avec reessai, vide contextualise, succes. Jamais un ecran
   blanc, jamais un spinner plein ecran.
3. **La densite sert le comptoir.** Le libraire scrute une liste, il ne la
   contemple pas. Lisibilite de biais, en trois secondes.
4. **Le serveur filtre, trie et pagine.** L'interface ne triche jamais en
   chargeant tout pour trier ensuite.

## Ton

Metier, pose, francais sans jargon technique. Le libraire lit « Aucun ouvrage
ne porte ce titre » et non « 0 resultats ». Aucune exclamation, aucune
familiarite, aucun emoji.

## Perimetre ecarte

**Envoi et retrait d'une couverture par le libraire.** Les routes
`POST /books/:id/cover` et `DELETE /books/:id/cover` figurent a l'annexe du
sujet, mais l'API livree (`api-books-v2`) n'expose aucune route de couverture :
ni celles-la, ni la couverture generee `GET /covers/:id.svg`. Arbitrage du
responsable produit : la fonctionnalite sort du perimetre plutot que d'etendre
l'API.

Consequence directe : le champ `couverture` vaut `null` sur les 500 ouvrages du
fonds. L'affichage repose donc sur un service tiers quand l'ouvrage y est
reference, et sur un repli local sinon. Voir ADR 004.

## Anti-references

- **La papeterie nostalgique.** Sepia, papier vieilli, serif de titre, texture
  de cuir. Le reflexe « application de livres ». On numerise le cahier pour
  s'en debarrasser, pas pour le mimer a l'ecran.
- **Le tableau de bord SaaS.** Grand chiffre, petit label, degrade d'accent,
  grille de cartes identiques.
- **L'outil de developpeur sombre.** Voir la scene d'usage.
