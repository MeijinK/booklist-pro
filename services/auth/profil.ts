import { UtilisateurSchema, type Utilisateur } from "@/domain";
import { storage } from "@/services/storage";

/**
 * Who is signed in, kept in ordinary storage: an id, an email and a role are
 * not secrets, and reading them at start-up is what lets the application open
 * on the collection without a network round trip. A stale role is corrected by
 * the first 403 the server sends.
 */
const CLE = "booklist.session.utilisateur";

export async function lireUtilisateur(): Promise<Utilisateur | null> {
  const brut = await storage.read(CLE);
  if (brut === null) return null;

  try {
    const parsed = UtilisateurSchema.safeParse(JSON.parse(brut));
    return parsed.success ? parsed.data : null;
  } catch {
    // Unreadable JSON left by an older build: treated as no profile.
    return null;
  }
}

export async function ecrireUtilisateur(utilisateur: Utilisateur): Promise<void> {
  await storage.write(CLE, JSON.stringify(utilisateur));
}

export async function effacerUtilisateur(): Promise<void> {
  await storage.remove(CLE);
}
