import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { NoteComposer } from "@/components/notes/NoteComposer";
import { NOTE_MAX_LENGTH } from "@/domain";
import { renderWithTheme } from "@/test-utils/render";

const FIELD = "Note de lecture";
const SUBMIT = "Ajouter la note";

function renderComposer(onSubmit: jest.Mock, sending = false) {
  renderWithTheme(<NoteComposer onSubmit={onSubmit} sending={sending} />);
  return onSubmit;
}

function write(text: string): void {
  fireEvent.changeText(screen.getByLabelText(FIELD), text);
}

describe("NoteComposer", () => {
  it("refuses an empty note without troubling the server", () => {
    const onSubmit = renderComposer(jest.fn());

    fireEvent.press(screen.getByText(SUBMIT));

    expect(screen.getByText("Une note de lecture ne peut pas etre vide.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the note, whitespace trimmed", async () => {
    const onSubmit = renderComposer(jest.fn().mockResolvedValue(true));

    write("  Traduction inegale.  ");
    await act(async () => fireEvent.press(screen.getByText(SUBMIT)));

    expect(onSubmit).toHaveBeenCalledWith("Traduction inegale.");
  });

  it("empties the field once the note is recorded", async () => {
    renderComposer(jest.fn().mockResolvedValue(true));

    write("Traduction inegale.");
    await act(async () => fireEvent.press(screen.getByText(SUBMIT)));

    await waitFor(() => expect(screen.getByLabelText(FIELD).props.value).toBe(""));
  });

  it("keeps the text when the server refuses: nothing typed is ever lost", async () => {
    renderComposer(jest.fn().mockResolvedValue(false));

    write("Traduction inegale.");
    await act(async () => fireEvent.press(screen.getByText(SUBMIT)));

    expect(screen.getByLabelText(FIELD).props.value).toBe("Traduction inegale.");
  });

  it("clears the refusal as soon as the bookseller starts writing", () => {
    renderComposer(jest.fn());

    fireEvent.press(screen.getByText(SUBMIT));
    expect(screen.getByText("Une note de lecture ne peut pas etre vide.")).toBeTruthy();

    write("T");
    expect(screen.queryByText("Une note de lecture ne peut pas etre vide.")).toBeNull();
  });

  it("stays quiet about the length until the end is close", () => {
    renderComposer(jest.fn());

    write("a".repeat(400));

    expect(screen.queryByText(/caracteres restants/)).toBeNull();
  });

  it("counts down once the limit is within reach", () => {
    renderComposer(jest.fn());

    write("a".repeat(NOTE_MAX_LENGTH - 40));

    expect(screen.getByText("40 caracteres restants")).toBeTruthy();
  });

  it("blocks a second send while the first is travelling", () => {
    renderComposer(jest.fn(), true);

    expect(screen.getByLabelText(FIELD).props.editable).toBe(false);
  });
});
