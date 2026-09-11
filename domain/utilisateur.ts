import { z } from "zod";

export const ROLES = ["editeur", "lecteur"] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

/** What /auth/login and /me return about the signed-in bookseller. */
export const UtilisateurSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: RoleSchema,
});
export type Utilisateur = z.infer<typeof UtilisateurSchema>;

/**
 * The one place that turns a role into a permission. Every write control in
 * the interface asks this, so a third role tomorrow changes one line.
 */
export function peutEcrire(role: Role | undefined): boolean {
  return role === "editeur";
}

/** Wording addressed to the bookseller, not the API's identifiers. */
export const ROLE_LABELS: Record<Role, string> = {
  editeur: "Libraire titulaire",
  lecteur: "Lecture seule",
};

export const ConnexionSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est obligatoire.")
    .pipe(z.email("Cet email n'est pas valide.")),
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire."),
});
export type ConnexionValues = z.infer<typeof ConnexionSchema>;
