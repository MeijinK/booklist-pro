import { screen } from "@testing-library/react-native";

import { BookEnrichment } from "@/components/books/BookEnrichment";
import { renderWithTheme } from "@/test-utils/render";

describe("BookEnrichment", () => {
  it("announces how many editions a catalogue references", () => {
    renderWithTheme(<BookEnrichment editionCount={42} firstPublishYear={1937} loading={false} />);

    expect(screen.getByText("42 editions referencees")).toBeOnTheScreen();
    expect(screen.getByText("Premiere publication en 1937")).toBeOnTheScreen();
  });

  it("keeps the singular for a lone edition", () => {
    renderWithTheme(<BookEnrichment editionCount={1} firstPublishYear={2001} loading={false} />);

    expect(screen.getByText("1 edition referencee")).toBeOnTheScreen();
  });

  it("groups the thousands, as a bookseller reads them", () => {
    renderWithTheme(<BookEnrichment editionCount={1234} firstPublishYear={null} loading={false} />);

    // Narrow no-break space in the French grouping; matched loosely so the test
    // does not hinge on which space character the platform picks.
    expect(screen.getByText(/1.234 editions referencees/)).toBeOnTheScreen();
  });

  it("says nothing was found in a sentence, never as a bare zero", () => {
    // A collection partly entered in a hurry produces this case routinely: it is
    // a normal answer, not a failure, and an outage reads the same by design.
    renderWithTheme(<BookEnrichment editionCount={0} firstPublishYear={null} loading={false} />);

    expect(screen.getByText("Aucune edition referencee")).toBeOnTheScreen();
    expect(screen.queryByText("0")).not.toBeOnTheScreen();
  });

  it("omits the publication year when the catalogue has none", () => {
    renderWithTheme(<BookEnrichment editionCount={3} firstPublishYear={null} loading={false} />);

    expect(screen.queryByText(/Premiere publication/)).not.toBeOnTheScreen();
  });

  it("names its source, so a figure is never mistaken for the shop's own data", () => {
    renderWithTheme(<BookEnrichment editionCount={3} firstPublishYear={null} loading={false} />);

    expect(screen.getByText("D'apres OpenLibrary")).toBeOnTheScreen();
  });

  it("holds the answer back while the catalogue is being queried", () => {
    renderWithTheme(<BookEnrichment editionCount={0} firstPublishYear={null} loading />);

    expect(screen.queryByText("Aucune edition referencee")).not.toBeOnTheScreen();
  });
});
