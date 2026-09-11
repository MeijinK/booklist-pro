import { brancherNavigateur } from "./etat";

export * from "./etat";

/**
 * Browser target: wired once at import. `navigator.onLine` is what Playwright's
 * `context.setOffline` drives, so the acceptance run and the till agree.
 */
if (typeof window !== "undefined" && typeof navigator !== "undefined") {
  brancherNavigateur({
    get onLine() {
      return navigator.onLine;
    },
    addEventListener: (nom, ecouteur) => window.addEventListener(nom, ecouteur),
    removeEventListener: (nom, ecouteur) => window.removeEventListener(nom, ecouteur),
  });
}
