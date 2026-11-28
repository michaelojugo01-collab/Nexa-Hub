// Same design tokens as the app: the shared preset from @nexa/ui (also used by NativeWind).
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('@nexa/ui/tailwind-preset')],
  theme: {
    extend: {
      maxWidth: { page: '640px' },
    },
  },
};
