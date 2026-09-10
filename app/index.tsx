import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";

import { ThemeMenu } from "@/components/ui/ThemeMenu";
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
          // This screen replaces the shared header action, so it carries the
          // theme switch itself rather than dropping it.
          headerRight: () => (
            <View style={{ alignItems: "center", flexDirection: "row" }}>
              {/* Without an explicit label, the icon glyph ends up in the
                  button's accessible name and gets read out loud. */}
              <Button accessibilityLabel="Ajouter" mode="text" icon="plus" onPress={create}>
                Ajouter
              </Button>
              <ThemeMenu />
            </View>
          ),
        }}
      />

      <BookList onOpen={open} onCreate={create} />
    </>
  );
}
