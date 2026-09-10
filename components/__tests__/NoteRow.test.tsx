import { fireEvent, screen } from "@testing-library/react-native";

import { NoteRow } from "@/components/notes/NoteRow";
import type { Note } from "@/domain";
import { renderWithTheme } from "@/test-utils/render";

const NOTE: Note = {
  id: "n-1",
  livreId: "l-1",
  contenu: "Traduction inegale, preferer la version originale.",
  createdAt: "2026-07-28T09:40:06.361Z",
};

function renderRow(overrides: Partial<Parameters<typeof NoteRow>[0]> = {}) {
  const onDelete = jest.fn();
  renderWithTheme(<NoteRow note={NOTE} sending={false} onDelete={onDelete} {...overrides} />);
  return onDelete;
}

describe("NoteRow", () => {
  it("stamps the note with a date and an hour", () => {
    renderRow();

    // Several notes are written on the same day: the day alone would not order
    // them, and would not say who wrote when.
    expect(screen.getByText(/28 juillet 2026 a \d{2}:\d{2}/)).toBeTruthy();
  });

  it("displays what the note says", () => {
    renderRow();

    expect(screen.getByText(NOTE.contenu)).toBeTruthy();
  });

  it("asks before removing, and deletes nothing on its own", () => {
    const onDelete = renderRow();

    fireEvent.press(screen.getByLabelText(/Supprimer la note du 28 juillet 2026/));

    expect(screen.getByText("Retirer cette note du cahier ?")).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("removes the note once the question is answered", () => {
    const onDelete = renderRow();

    fireEvent.press(screen.getByLabelText(/Supprimer la note du/));
    fireEvent.press(screen.getByText("Retirer"));

    expect(onDelete).toHaveBeenCalledWith("n-1");
  });

  it("puts the question away when the note is kept", () => {
    const onDelete = renderRow();

    fireEvent.press(screen.getByLabelText(/Supprimer la note du/));
    fireEvent.press(screen.getByText("Conserver"));

    expect(screen.queryByText("Retirer cette note du cahier ?")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("offers no deletion for a note the server has not recorded yet", () => {
    renderRow({ sending: true });

    expect(screen.getByText("Envoi en cours")).toBeTruthy();
    expect(screen.queryByLabelText(/Supprimer la note/)).toBeNull();
    // The text stays readable while it travels: it is not hidden behind a
    // spinner, and it is what the bookseller just wrote.
    expect(screen.getByText(NOTE.contenu)).toBeTruthy();
  });
});
