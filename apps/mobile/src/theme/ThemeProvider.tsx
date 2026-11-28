import { colorVar, themes, type Theme, type ThemeColors, type ThemeName } from '@nexa/ui';
import { vars } from 'nativewind';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

const ThemeContext = createContext<Theme>(themes.light);

/** Turns semantic colours into the CSS variables the Tailwind preset points at. */
function toCssVars(theme: Theme) {
  return vars(
    Object.fromEntries(
      Object.entries(theme.colors).map(([key, value]) => [
        colorVar(key as keyof ThemeColors),
        value,
      ]),
    ),
  );
}

type ThemeProviderProps = {
  /** Only 'light' exists today; dark mode plugs in here later. */
  name?: ThemeName;
  children: ReactNode;
};

export function ThemeProvider({ name = 'light', children }: ThemeProviderProps) {
  const theme = themes[name];
  const style = useMemo(() => toCssVars(theme), [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </ThemeContext.Provider>
  );
}

/** Raw theme values, for props that cannot take a className (icons, gradients, spinners). */
export function useTheme() {
  return useContext(ThemeContext);
}
