import { useLocalSearchParams, useRouter } from "expo-router";

import { BookRecord } from "@/features/books/BookRecord";
import { useSession } from "@/features/session";

export default function BookRecordScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { peutEcrire } = useSession();

  const backToList = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <BookRecord
      id={id ?? ""}
      onEdit={(bookId) => router.push({ pathname: "/books/[id]/edit", params: { id: bookId } })}
      onDeleted={backToList}
      onBackToList={backToList}
      readOnly={!peutEcrire}
    />
  );
}
