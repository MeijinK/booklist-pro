import { renderHook } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

describe('useThemeColor', () => {
  it('retourne la couleur du thème quand aucune surcharge n’est fournie', () => {
    const { result } = renderHook(() => useThemeColor({}, 'text'));

    expect(result.current).toBe(Colors.light.text);
  });

  it('retourne la surcharge fournie pour le thème courant', () => {
    const { result } = renderHook(() => useThemeColor({ light: '#abcdef' }, 'text'));

    expect(result.current).toBe('#abcdef');
  });

  it('ignore une surcharge destinée à l’autre thème', () => {
    const { result } = renderHook(() => useThemeColor({ dark: '#abcdef' }, 'background'));

    expect(result.current).toBe(Colors.light.background);
  });
});
