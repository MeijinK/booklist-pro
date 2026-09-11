import { fireEvent, screen } from "@testing-library/react-native";

import { StarRating } from "@/components/ui/StarRating";
import { renderWithTheme } from "@/test-utils/render";

describe("StarRating", () => {
  it("offers the five ratings the scale allows", () => {
    renderWithTheme(<StarRating value={null} onChange={jest.fn()} />);

    for (const star of [1, 2, 3, 4, 5]) {
      expect(screen.getByLabelText(`Noter ${star} sur 5`)).toBeOnTheScreen();
    }
  });

  it("reports the chosen rating", () => {
    const onChange = jest.fn();
    renderWithTheme(<StarRating value={null} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Noter 4 sur 5"));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("marks only the exact rating as selected, not every star below it", () => {
    // Three stars are filled, but a screen reader must hear one choice out of
    // five, not three answers at once.
    renderWithTheme(<StarRating value={3} onChange={jest.fn()} />);

    expect(screen.getByLabelText("Noter 3 sur 5")).toBeChecked();
    expect(screen.getByLabelText("Noter 2 sur 5")).not.toBeChecked();
  });

  it("announces the current rating on the group itself", () => {
    renderWithTheme(<StarRating value={3} onChange={jest.fn()} />);

    expect(screen.getByLabelText("Note de l'equipe : 3 sur 5")).toBeOnTheScreen();
  });

  it("says the book is unrated rather than announcing a zero", () => {
    renderWithTheme(<StarRating value={null} onChange={jest.fn()} />);

    expect(screen.getByLabelText("Note de l'equipe : pas encore notee")).toBeOnTheScreen();
  });

  it("offers to remove a rating only once there is one", () => {
    const { rerender } = renderWithTheme(<StarRating value={null} onChange={jest.fn()} />);
    expect(screen.queryByText("Retirer la note")).not.toBeOnTheScreen();

    rerender(<StarRating value={2} onChange={jest.fn()} />);
    expect(screen.getByText("Retirer la note")).toBeOnTheScreen();
  });

  it("clears the rating rather than setting it to zero", () => {
    // Null and zero are two different things for the API: the first means the
    // team has not ruled, the second that it ruled harshly.
    const onChange = jest.fn();
    renderWithTheme(<StarRating value={2} onChange={onChange} />);

    fireEvent.press(screen.getByText("Retirer la note"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("displays a stored zero without pretending it is an absence", () => {
    renderWithTheme(<StarRating value={0} onChange={jest.fn()} />);

    expect(screen.getByLabelText("Note de l'equipe : 0 sur 5")).toBeOnTheScreen();
  });

  it("accepts nothing when the bookseller has no write rights", () => {
    const onChange = jest.fn();
    renderWithTheme(<StarRating value={2} onChange={onChange} disabled />);

    fireEvent.press(screen.getByLabelText("Noter 4 sur 5"));

    expect(onChange).not.toHaveBeenCalled();
    // The removal is hidden rather than disabled: the brief asks for actions to
    // be masked, not merely greyed out, when the role forbids them.
    expect(screen.queryByText("Retirer la note")).not.toBeOnTheScreen();
  });
});
