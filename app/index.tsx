import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";

import { Button } from "react-native-paper";

import { BookList } from "@/features/books/BookList";

/**
 * Collection screen. It only wires up navigation: the list, its states and its
 * pagination live in features/books.
 */
export default function BookListScreen() {
  const router = useRouter();
  const create = useCallback(() => router.push("/books/new"), [router]);

  // Stable identity down to the memoised rows: recreated on every render, this
  // callback alone would redraw the whole list on each keystroke.
  const open = useCallback(
    (id: string) => router.push({ pathname: "/books/[id]", params: { id } }),
    [router],
  );

  return (
    <>
      {/* Adding stays reachable whatever the state of the list: the action
          offered in the empty state disappears as soon as a book exists. */}
      <Stack.Screen
        options={{
          headerRight: () => (
            // Without an explicit label, the icon glyph ends up in the button's
            // accessible name and gets read out loud.
            <Button accessibilityLabel="Ajouter" mode="text" icon="plus" onPress={create}>
              Ajouter
            </Button>
          ),
        }}
      />

      <BookList onOpen={open} onCreate={create} />
    </>
  );
}
