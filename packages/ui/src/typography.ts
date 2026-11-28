/**
 * Typography tokens.
 * TODO(brand-font): no brand font chosen yet — using the platform system font
 * (San Francisco / Roboto). When chosen, load it with expo-font and set fontFamily here.
 */
export const fontFamily = {
  sans: undefined as string | undefined,
} as const;

/** [fontSize, lineHeight] in pixels */
export const fontSize = {
  xs: [12, 16],
  sm: [14, 20],
  base: [16, 24],
  lg: [18, 26],
  xl: [20, 28],
  '2xl': [24, 32],
  '3xl': [30, 38],
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;
