import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemedView } from '@/components/themed-view';

describe('ThemedView', () => {
  it('applique la couleur de fond explicite', () => {
    render(
      <ThemedView testID="conteneur" lightColor="#123456" darkColor="#123456">
        <Text>Contenu</Text>
      </ThemedView>
    );

    expect(screen.getByTestId('conteneur')).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('rend ses enfants', () => {
    render(
      <ThemedView>
        <Text>Contenu</Text>
      </ThemedView>
    );

    expect(screen.getByText('Contenu')).toBeOnTheScreen();
  });
});
