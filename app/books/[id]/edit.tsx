import { useLocalSearchParams, useRouter } from "expo-router";

import { EditBook } from "@/features/books/EditBook";

export default function EditBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return <EditBook id={id ?? ""} onSaved={goBack} onCancel={goBack} />;
}
