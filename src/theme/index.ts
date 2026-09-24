import { useColorScheme } from 'react-native';

const light = {
  background: '#FFF8F3',
  surface: '#FFFFFF',
  surfaceAlt: '#FCEDE4',
  text: '#2B2330',
  textMuted: '#75687A',
  primary: '#D9574A',
  primaryText: '#FFFFFF',
  secondary: '#4E7FE0',
  accent: '#E9A21B',
  success: '#2E9A69',
  danger: '#C23B3B',
  border: '#EFDFD5',
  track: '#F3E3D9',
};

const dark: typeof light = {
  background: '#16131A',
  surface: '#211C26',
  surfaceAlt: '#2C2533',
  text: '#F6EFF3',
  textMuted: '#B3A7B8',
  primary: '#F08476',
  primaryText: '#1B1418',
  secondary: '#86A9F5',
  accent: '#F7C65E',
  success: '#52C08D',
  danger: '#F07A7A',
  border: '#3A3140',
  track: '#3A3140',
};

export type Palette = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const fontSize = { caption: 13, body: 16, heading: 19, title: 26, hero: 34 } as const;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
