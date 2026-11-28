// Tailwind/NativeWind preset generated from the TS tokens (loaded through Tailwind's jiti).
// It REPLACES Tailwind's default colours, spacing, radius and font sizes, so only
// Nexa tokens exist as classes (e.g. `bg-red-500` does not compile to anything).
const {
  colorVar,
  lightColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  toKebab,
} = require('./src/index.ts');

const px = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, `${v}px`]));

// Semantic colours point at CSS variables so a dark theme can swap them at runtime.
const colors = Object.fromEntries(
  Object.keys(lightColors).map((key) => [toKebab(key), `var(${colorVar(key)})`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    colors: { transparent: 'transparent', ...colors },
    spacing: px(spacing),
    borderRadius: px(radius),
    fontSize: Object.fromEntries(
      Object.entries(fontSize).map(([k, [size, lineHeight]]) => [
        k,
        [`${size}px`, { lineHeight: `${lineHeight}px` }],
      ]),
    ),
    fontWeight,
  },
};
