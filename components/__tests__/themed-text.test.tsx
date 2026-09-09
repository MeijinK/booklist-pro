import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';

describe('ThemedText', () => {
  it('affiche le texte passé en enfant', () => {
    render(<ThemedText>Ma bibliothèque</ThemedText>);

    expect(screen.getByText('Ma bibliothèque')).toBeOnTheScreen();
  });

  it('applique la typographie du variant demandé', () => {
    render(<ThemedText type="title">Titre</ThemedText>);

    expect(screen.getByText('Titre')).toHaveStyle({ fontSize: 32, fontWeight: 'bold' });
  });

  it('laisse la couleur explicite primer sur le thème', () => {
    render(
      <ThemedText lightColor="#ff0000" darkColor="#ff0000">
        Alerte
      </ThemedText>
    );

    expect(screen.getByText('Alerte')).toHaveStyle({ color: '#ff0000' });
  });
});
