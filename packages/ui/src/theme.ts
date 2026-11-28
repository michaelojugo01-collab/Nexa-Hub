import { chromeGradient, palette } from './colors';

/**
 * Semantic colour roles. Components only ever reference these names.
 * Dark mode later = add a `dark` object with the same keys; nothing else changes.
 */
export type ThemeColors = {
  /** Screen background */
  bg: string;
  /** Cards, sheets, inputs */
  surface: string;
  /** Skeletons, pressed rows, subtle fills */
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  /** Text on `primary` */
  textInverse: string;
  border: string;
  borderStrong: string;
  /** Main action colour (buttons, active tab) */
  primary: string;
  primaryPressed: string;
  /** Chrome accent for highlights, focus rings, featured badges */
  accent: string;
  accentMuted: string;
  overlay: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
};

export const lightColors: ThemeColors = {
  bg: palette.white,
  surface: palette.white,
  surfaceMuted: palette.gray[100],
  text: palette.black,
  textMuted: palette.gray[600],
  textSubtle: palette.gray[500],
  textInverse: palette.white,
  border: palette.gray[200],
  borderStrong: palette.gray[300],
  primary: palette.black,
  primaryPressed: palette.gray[800],
  accent: palette.chrome[400],
  accentMuted: palette.chrome[100],
  overlay: 'rgba(10, 10, 10, 0.5)',
  success: palette.green[600],
  successBg: palette.green[50],
  warning: palette.amber[600],
  warningBg: palette.amber[50],
  error: palette.red[600],
  errorBg: palette.red[50],
};

export const themes = {
  light: { colors: lightColors, chromeGradient },
  // TODO(dark-mode): add `dark` with the same shape.
} as const;

export type ThemeName = keyof typeof themes;
export type Theme = (typeof themes)[ThemeName];

/** `textMuted` → `text-muted`: the Tailwind class suffix for a semantic colour. */
export function toKebab(key: string) {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** CSS variable name for a semantic colour, e.g. `--color-text-muted`. */
export function colorVar(key: keyof ThemeColors) {
  return `--color-${toKebab(key)}`;
}
