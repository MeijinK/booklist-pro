import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { EditBook } from "@/features/books/EditBook";
import { useSession } from "@/features/session";

export default function EditBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { peutEcrire } = useSession();

  // A reader account reaching this URL by hand gets the collection, not a
  // form the server would refuse anyway.
  if (!peutEcrire) return <Redirect href="/" />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return <EditBook id={id ?? ""} onSaved={goBack} onCancel={goBack} />;
}
