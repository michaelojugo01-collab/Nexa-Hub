# Nexa Hub

A mobile app built with [Expo](https://expo.dev) (SDK 58) and React Native, using
[Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation and TypeScript.

## Getting started

Requirements: Node.js 22 (see `.nvmrc`) and the **Expo Go** app on your phone
([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).

```bash
npm install
npm start          # starts the dev server; scan the QR code with Expo Go
```

Other ways to run it:

```bash
npm run android    # Android emulator (needs Android Studio)
npm run ios        # iOS simulator (needs macOS + Xcode)
npm run web        # in the browser
```

## Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm start`         | Start the Expo dev server                      |
| `npm run lint`      | Lint with ESLint (`eslint-config-expo`)        |
| `npm run typecheck` | Type-check with `tsc --noEmit`                 |
| `npm run reset-project` | Move the starter code to `example/` and start from a blank `src/app` |

Add packages with `npx expo install <package>` (not `npm install`) so you get versions
compatible with the Expo SDK.

## Project structure

```
src/
  app/          # Routes — every file is a screen, _layout.tsx defines navigators
  components/   # Reusable UI components
  constants/    # Theme colors, spacing
  hooks/        # Custom hooks
assets/         # Images, icons, splash screen
app.json        # Expo app config (name, icons, plugins)
```

## Building for stores

Use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android   # or ios
```
