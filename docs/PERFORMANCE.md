# Performance de la liste du fonds

## Objet

Le lot 3 demande « une mesure avant et après optimisation, avec la méthode employée ».

Une particularité de ce projet a orienté la démarche : les optimisations n'ont jamais été absentes. La mémoïsation des lignes et l'anti-rebond de la recherche ont été écrits en même temps que la liste, et React Compiler était activé dès l'initialisation du dépôt. Il n'existait donc aucun état « avant » à mesurer.

Plutôt que de présenter la mesure courante comme un avant, l'état non optimisé a été **reconstitué** en retirant les trois optimisations, sur une branche jetable. La comparaison porte sur le même code, le même jeu de données et le même geste.

## Protocole

Ce protocole est à reproduire à l'identique pour toute nouvelle mesure : c'est lui, et non l'outil, qui rend les chiffres comparables.

**Environnement**

- API `api-books-v2` en **mode normal** (`npm start`), base régénérée par `npm run seed` — 500 ouvrages. Le mode dégradé est écarté volontairement : sa latence de 1,5 s et ses 30 % de 503 mesureraient le serveur, pas l'interface.
- Application lancée par `npx expo start --web -c`. Le `-c` est indispensable : `reactCompiler` est une option de Babel, et sans vider le cache de Metro on remesure le bundle précédent.
- Chrome, extension React Developer Tools, onglet **Profiler**.

**Scénario**

1. Charger la liste, puis demander une dizaine de pages supplémentaires jusqu'à **environ 200 lignes montées**.
2. Démarrer l'enregistrement **seulement à ce moment**, pour que le chargement initial ne pollue pas le relevé.
3. Taper une dizaine de caractères d'affilée dans la barre de recherche, sans pause.
4. Attendre que les résultats s'affichent, puis arrêter l'enregistrement.

**Pourquoi 200 lignes.** La liste pagine par 20 : au premier chargement, 20 lignes seulement sont montées, et l'écart entre un rendu mémoïsé et un rendu non mémoïsé y est invisible. Il croît avec le nombre de lignes montées. Un relevé effectué sur 20 lignes a d'ailleurs donné 9,3 ms, un chiffre qui ne démontre rien.

**Relevés**

- le **nombre total de commits** de la session ;
- la **durée de rendu du commit le plus long**.

## États comparés

| | React Compiler | `memo` sur `BookRow` | Anti-rebond de la recherche |
|---|---|---|---|
| **A — avant** | désactivé | retiré | 0 ms |
| **C — après** | activé | présent | 300 ms |

L'état A se reconstitue par trois modifications, à annuler ensuite :

1. `app.json` → `"reactCompiler": false`
2. `components/books/BookRow.tsx` → retirer l'enveloppe `memo(...)` autour du composant
3. `components/books/BookToolbar.tsx` → `SEARCH_DEBOUNCE_MS = 0`

Puis relancer avec `npx expo start --web -c`, sans quoi la première modification reste sans effet.

## Résultats

| | Commits | Rendu du commit le plus long |
|---|---|---|
| **A — avant** | **129** | **57,3 ms** |
| **C — après** | **39** | **31,9 ms** |

Soit **trois fois moins de commits** et **44 % de temps de rendu en moins** pour une seule recherche.

## Lecture

**Le nombre de commits mesure l'anti-rebond.** Sans lui, chaque frappe pousse immédiatement un nouveau terme de recherche : nouvelle clé de cache, nouvelle requête, barre de progression, arrivée des données, redessin des 200 lignes. Une dizaine de lettres produit ainsi 129 mises à jour là où le comportement attendu en produit une trentaine — l'essentiel du reste étant le champ de saisie lui-même, qui doit bien se redessiner à chaque lettre.

C'est ce chiffre qui répond à l'exigence du sujet : « la frappe dans la barre de recherche ne doit pas re-rendre toute la liste ».

**Le temps de rendu mesure la mémoïsation.** 57,3 ms représentent près de quatre images perdues à 60 Hz ; 31,9 ms en représentent deux. Le gain est réel, mais reste inférieur à ce que l'on attendrait — voir ci-dessous.

**Les millisecondes sont indicatives, le nombre de commits ne l'est pas.** Deux exécutions successives de l'état C ont donné 31,9 ms et 9,1 ms selon le commit observé : une durée dépend de la machine, de sa charge, et du commit sur lequel on tombe. Le nombre de commits, lui, découle de la structure du code et se retrouvera sur n'importe quel poste. Un correcteur qui rejoue ce protocole doit s'attendre à retrouver l'ordre de grandeur des commits, pas les millisecondes.

## Ce que la mesure a appris

**React Compiler rend la mémoïsation manuelle largement redondante.** Un premier essai n'avait retiré que le `memo` de `BookRow`, en laissant le compilateur actif : les deux relevés étaient identiques au bruit près. C'est logique — le compilateur réinsère à la compilation une mémoïsation équivalente. L'écart n'apparaît qu'en coupant les deux.

Le `memo` explicite a néanmoins été conservé. Il ne coûte rien, il documente une intention que le compilateur ne documente pas, et il protège le jour où l'option expérimentale serait désactivée.

**La première mesure tentée ne mesurait rien.** Elle portait sur une seule frappe, après une pause : l'anti-rebond déclenchait alors une recherche légitime, et le redessin complet de la liste observé était le comportement correct. C'est en tapant une série de caractères sans pause que la distinction apparaît. Une mesure mal conçue ne donne pas un mauvais chiffre, elle donne un chiffre qui ne répond pas à la question posée.

## Limites

- Un seul poste, un seul navigateur, une seule exécution par état. Aucune moyenne sur plusieurs passes.
- La mesure porte sur la recherche. Le défilement et le chargement de pages n'ont pas été profilés séparément.
- Le nombre de lignes montées est approximatif (« une dizaine de pages »), ce qui suffit pour un rapport d'ordre de grandeur mais pas pour une comparaison au pourcentage près.
