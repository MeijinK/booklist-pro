import { useRouter } from "expo-router";

import { CreateBook } from "@/features/books/CreateBook";

export default function NewBookScreen() {
  const router = useRouter();

  // Back to the list rather than to the created record: the common gesture is
  // to enter several in a row, not to re-read the one just written.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return <CreateBook onSaved={goBack} onCancel={goBack} />;
}
