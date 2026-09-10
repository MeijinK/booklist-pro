import { Platform } from "react-native";
import { configureFonts, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { couleurs } from "./couleurs";

/**
 * Une seule famille, celle du systeme : l'application vit sur des postes de
 * caisse heterogenes, et une police chargee au demarrage retarde le premier
 * affichage sans rien apporter a un outil de saisie.
 */
export const FAMILLE = Platform.select({
  web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  ios: "system-ui",
  default: "sans-serif",
});

/**
 * Traduction de nos jetons dans le vocabulaire Material 3 attendu par
 * React Native Paper.
 *
 * Le theme est le seul point de contact entre la palette du projet et la
 * librairie : un composant qui irait chercher `couleurs.accent` a la main
 * reintroduirait deux sources de verite, et le jour ou la palette bouge, l'une
 * des deux serait oubliee.
 *
 * Le mode clair est le seul declare : la scene d'usage (poste de caisse devant
 * une vitrine ensoleillee) tranche, et un theme sombre non teste ferait pire
 * que pas de theme sombre du tout.
 */
export const themePaper: MD3Theme = {
  ...MD3LightTheme,
  // Les coins Material par defaut sont plus ronds que notre echelle : un rayon
  // unique aligne boutons, champs et dialogues sur la meme geometrie.
  roundness: 2,
  fonts: configureFonts({ config: { fontFamily: FAMILLE } }),
  colors: {
    ...MD3LightTheme.colors,

    primary: couleurs.accent,
    onPrimary: couleurs.texteInverse,
    primaryContainer: couleurs.accentFond,
    onPrimaryContainer: couleurs.accentAppuye,

    secondary: couleurs.texte,
    onSecondary: couleurs.texteInverse,
    secondaryContainer: couleurs.surfaceCreuse,
    onSecondaryContainer: couleurs.texteFort,

    tertiary: couleurs.accent,
    onTertiary: couleurs.texteInverse,
    tertiaryContainer: couleurs.accentFond,
    onTertiaryContainer: couleurs.accentAppuye,

    error: couleurs.destructif,
    onError: couleurs.texteInverse,
    errorContainer: couleurs.destructifFond,
    onErrorContainer: couleurs.destructifAppuye,

    background: couleurs.fond,
    onBackground: couleurs.texte,
    surface: couleurs.surface,
    onSurface: couleurs.texteFort,
    surfaceVariant: couleurs.surfaceCreuse,
    onSurfaceVariant: couleurs.texteFaible,

    outline: couleurs.bordureFerme,
    outlineVariant: couleurs.bordure,

    inverseSurface: couleurs.inverse,
    inverseOnSurface: couleurs.texteInverse,
    inversePrimary: couleurs.accentBordure,

    surfaceDisabled: couleurs.surfaceCreuse,
    onSurfaceDisabled: couleurs.texteFaible,
    backdrop: "rgba(47, 49, 64, 0.45)",

    // Material teinte les surfaces selon leur elevation. Nos surfaces sont
    // plates : on neutralise la teinte plutot que de la subir a moitie.
    elevation: {
      level0: "transparent",
      level1: couleurs.surface,
      level2: couleurs.surface,
      level3: couleurs.surfaceCreuse,
      level4: couleurs.surfaceCreuse,
      level5: couleurs.surfaceActive,
    },
  },
};
