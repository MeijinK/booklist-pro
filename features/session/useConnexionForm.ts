import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ConnexionSchema, type ConnexionValues } from "@/domain";
import { errorMessage } from "@/features/errors/messages";

export type ConnexionFormReturn = UseFormReturn<ConnexionValues>;

type Options = { connexion: (email: string, motDePasse: string) => Promise<void> };

/**
 * Local validation by zod; a refusal from the server lands on the form as a
 * whole, because the API does not say which of the two fields is wrong — and
 * must not, or it would confirm which emails have an account.
 */
export function useConnexionForm({ connexion }: Options) {
  const form: ConnexionFormReturn = useForm<ConnexionValues>({
    resolver: zodResolver(ConnexionSchema),
    defaultValues: { email: "", motDePasse: "" },
    mode: "onBlur",
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await connexion(values.email, values.motDePasse);
    } catch (cause) {
      const { title, detail } = errorMessage(cause);
      form.setError("root", { type: "server", message: `${title}. ${detail}` });
    }
  });

  return { form, submit };
}
