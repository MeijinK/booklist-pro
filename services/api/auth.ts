import { z } from "zod";

import { UtilisateurSchema, type Utilisateur } from "@/domain";
import { enregistrerJetons } from "@/services/auth/jetons";

import { request } from "./client";

const ConnexionReponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  utilisateur: UtilisateurSchema,
});

/**
 * POST /auth/login. The tokens go straight into the vault; only the profile
 * comes out, so no caller — and no React state — ever holds a refresh token.
 */
export async function connexion(email: string, motDePasse: string): Promise<Utilisateur> {
  const reponse = await request("/auth/login", {
    method: "POST",
    body: { email, motDePasse },
    schema: ConnexionReponseSchema,
    auth: false,
  });

  await enregistrerJetons({
    accessToken: reponse.accessToken,
    refreshToken: reponse.refreshToken,
  });
  return reponse.utilisateur;
}

/** GET /me — the profile as the server sees it now. */
export function profil(signal?: AbortSignal): Promise<Utilisateur> {
  return request("/me", { schema: UtilisateurSchema, signal });
}
