import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";

import { NOTE_COUNTER_THRESHOLD, NOTE_MAX_LENGTH, NoteDraftSchema } from "@/domain";
import { useBrouillon } from "@/features/sync/useBrouillon";
import { useTranslation } from "@/i18n";
import { space, useThemedStyles, type Palette } from "@/theme";

type Props = {
  /** Answers true once the note is recorded; false leaves the text in place. */
  onSubmit: (contenu: string) => Promise<boolean>;
  sending: boolean;
  /** When given, the text survives a reload under this key until it is sent. */
  brouillonCle?: string;
};

type ControleProps = Props & {
  initial: string;
  onChange: (texte: string) => void;
};

/**
 * Where a reading note is written.
 *
 * Always open, never behind an "add" button: a note is what the application is
 * for, and hiding the field would make the rarest gesture of the screen out of
 * the most useful one.
 *
 * The text only leaves the field once the server has accepted it. A refusal
 * leaves it where it was, ready to be sent again, because rule no. 1 of the
 * brief is that a bookseller's input is never lost.
 */
export function NoteComposer(props: Props) {
  if (props.brouillonCle === undefined) {
    return <NoteComposerControle {...props} initial="" onChange={() => undefined} />;
  }
  return <NoteComposerBrouillon {...props} brouillonCle={props.brouillonCle} />;
}

/** Waits for the stored draft before mounting the field, so it opens filled. */
function NoteComposerBrouillon({ brouillonCle, onSubmit, ...rest }: Props & { brouillonCle: string }) {
  const brouillon = useBrouillon(brouillonCle);
  if (brouillon.valeur === undefined) return null;

  return (
    <NoteComposerControle
      {...rest}
      initial={brouillon.valeur}
      onChange={brouillon.ecrire}
      onSubmit={async (contenu) => {
        const accepted = await onSubmit(contenu);
        if (accepted) await brouillon.effacer();
        return accepted;
      }}
    />
  );
}

function NoteComposerControle({ onSubmit, sending, initial, onChange }: ControleProps) {
  const styles = useThemedStyles(makeStyles);
  const { t, plural } = useTranslation();
  const [text, setText] = useState(initial);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const remaining = NOTE_MAX_LENGTH - text.length;
  const counting = text.length >= NOTE_COUNTER_THRESHOLD;

  const submit = async () => {
    const parsed = NoteDraftSchema.safeParse({ contenu: text });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message);
      return;
    }

    setMessage(undefined);
    if (await onSubmit(parsed.data.contenu)) setText("");
  };

  return (
    <View style={styles.block}>
      <TextInput
        accessibilityLabel={t("notes.compose.label")}
        aria-invalid={message !== undefined}
        disabled={sending}
        error={message !== undefined}
        label={t("notes.compose.placeholder")}
        maxLength={NOTE_MAX_LENGTH}
        mode="outlined"
        multiline
        numberOfLines={3}
        onChangeText={(value) => {
          setText(value);
          onChange(value);
          if (message !== undefined) setMessage(undefined);
        }}
        style={styles.field}
        value={text}
      />

      <View style={styles.footer}>
        {/* One line reserved for either message: without it, the button jumps
            up and down as the note is typed. */}
        <View style={styles.helper}>
          {message === undefined ? (
            counting ? (
              <HelperText type="info" visible>
                {plural("notes.remaining", remaining)}
              </HelperText>
            ) : null
          ) : (
            <HelperText type="error" visible>
              {message}
            </HelperText>
          )}
        </View>

        <Button
          disabled={sending}
          loading={sending}
          mode="contained"
          onPress={() => void submit()}
          style={styles.submit}
        >
          {t("notes.compose.submit")}
        </Button>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { gap: space.xs },
    field: { backgroundColor: colors.surface },
    footer: { alignItems: "center", flexDirection: "row", gap: space.sm },
    helper: { flexShrink: 1, flexGrow: 1, minHeight: 24 },
    submit: { justifyContent: "center", minHeight: 44 },
  });
