/**
 * Raw palette. Components never use these directly — they use the semantic
 * theme in ./theme.ts (via NativeWind classes like `bg-surface` or useTheme()).
 *
 * Brand: black and white with chrome (metallic silver) accents.
 */
export const palette = {
  black: '#0A0A0A',
  white: '#FFFFFF',

  // Chrome: cool metallic silvers, light → dark.
  chrome: {
    50: '#F7F8FA',
    100: '#EEF0F3',
    200: '#E1E4E8',
    300: '#C9CDD2',
    400: '#A9AEB5',
    500: '#8A9098',
    600: '#6B7179',
    700: '#4E535A',
  },

  // Neutral greys (warm-free, for text and surfaces).
  gray: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },

  // Status colours: deliberately muted to sit inside a monochrome brand.
  green: { 50: '#ECF7F0', 600: '#1F7A45', 700: '#17603A' },
  amber: { 50: '#FDF5E6', 600: '#A8650F', 700: '#86500B' },
  red: { 50: '#FCEDED', 600: '#B42323', 700: '#8F1C1C' },
} as const;

/**
 * The metallic "chrome shine": gradient stops for expo-linear-gradient.
 * Light bands between darker bands read as a polished-metal highlight.
 */
export const chromeGradient = {
  colors: ['#8A9098', '#E1E4E8', '#F7F8FA', '#A9AEB5', '#EEF0F3', '#8A9098'],
  locations: [0, 0.22, 0.38, 0.55, 0.78, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;
