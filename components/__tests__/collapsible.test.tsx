import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';

describe('Collapsible', () => {
  it('masque son contenu tant que la section est fermée', () => {
    render(
      <Collapsible title="Détails">
        <Text>Résumé du livre</Text>
      </Collapsible>
    );

    expect(screen.getByText('Détails')).toBeOnTheScreen();
    expect(screen.queryByText('Résumé du livre')).not.toBeOnTheScreen();
  });

  it('révèle puis remasque le contenu au clic sur le titre', async () => {
    const utilisateur = userEvent.setup();
    render(
      <Collapsible title="Détails">
        <Text>Résumé du livre</Text>
      </Collapsible>
    );

    await utilisateur.press(screen.getByText('Détails'));
    expect(await screen.findByText('Résumé du livre')).toBeOnTheScreen();

    await utilisateur.press(screen.getByText('Détails'));
    expect(screen.queryByText('Résumé du livre')).not.toBeOnTheScreen();
  });
});
