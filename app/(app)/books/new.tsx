import { Redirect, useRouter } from "expo-router";

import { CreateBook } from "@/features/books/CreateBook";
import { useSession } from "@/features/session";

export default function NewBookScreen() {
  const router = useRouter();
  const { peutEcrire } = useSession();

  // A reader account reaching this URL by hand gets the collection, not a
  // form the server would refuse anyway.
  if (!peutEcrire) return <Redirect href="/" />;

  // Back to the list rather than to the created record: the common gesture is
  // to enter several in a row, not to re-read the one just written.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return <CreateBook onSaved={goBack} onCancel={goBack} />;
}
