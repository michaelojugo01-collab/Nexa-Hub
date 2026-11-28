# Nexa Hub

A Nigerian creator and seller marketplace for iOS and Android, from one Expo codebase.

- Spec: [`docs/NEXA_HUB_Build_Specification.pdf`](docs/NEXA_HUB_Build_Specification.pdf)
- Decisions: [`docs/decisions.md`](docs/decisions.md)
- Project rules (for people and AI tools): [`CLAUDE.md`](CLAUDE.md)

## Getting started

Needs Node 22 (`.nvmrc`), pnpm 10 (`corepack enable`) and the **Expo Go** app on your phone
([iPhone](https://apps.apple.com/app/expo-go/id982107779) or
[Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).

```bash
pnpm install
pnpm dev          # Expo Go: scan the QR code (iPhone → Camera app, Android → Expo Go)
                  # (phone and computer must be on the same Wi-Fi)
pnpm dev:client   # same, but opens in a development build of Nexa Hub (see Builds)
```

Use Expo Go until we add a library with native code that Expo Go doesn't include. From then on,
install a development build once (`development` profile below) and use `pnpm dev:client`.

The app runs against a **mock API** by default (`apps/mobile/.env`). To see other states, create
`apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_MOCK_DELAY_MS=3000      # slow network → loading skeletons
EXPO_PUBLIC_MOCK_FAILURE_RATE=1     # every request fails → error states
EXPO_PUBLIC_MOCK_SCENARIO=empty     # empty lists → empty states
```

Restart `pnpm dev` after changing env values (add `--clear` if they don't apply).

**Signing in with mocks:** the code is always `123456` (also printed in the dev server log).
Returning accounts: `0803 123 4567` (seller) and `0805 555 0000` (buyer); any other number
creates a new user. **Dev settings** (Welcome screen or Profile, development only) can make SMS
fail, rate-limit code requests, simulate being offline, expire the access token, and reset the
mock database. Set `EXPO_PUBLIC_MOCK_ACCESS_TOKEN_TTL_SEC=30` to watch silent refresh, and
`EXPO_PUBLIC_APP_LOCK_AFTER_SEC=0` to test the app lock quickly.

Profile → **Components** (development only) shows every component in every state.

Android SMS auto-read and Face ID only work in a development build (`pnpm dev:client`), not
Expo Go.

## Scripts (run from the repo root)

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `pnpm dev`          | Start the Expo dev server                                      |
| `pnpm lint`         | ESLint across all packages                                     |
| `pnpm typecheck`    | TypeScript across all packages                                 |
| `pnpm test`         | Jest tests                                                     |
| `pnpm generate:api` | Regenerate API types from `packages/api-contract/openapi.yaml` |
| `pnpm format`       | Prettier                                                       |

## Layout

```
apps/mobile            Expo app (src/app = routes, src/components = the 15 core components,
                       src/features = screen code, src/mocks = fixtures + mock API)
apps/api|admin|web     not started
packages/api-contract  openapi.yaml, generated types, typed client
packages/ui            design tokens + Tailwind preset
packages/config        ESLint, Prettier, tsconfig
docs/                  spec and decisions log
```

## Builds (EAS, iOS and Android)

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform all
```

Profiles in `apps/mobile/eas.json`:

| Profile                 | Android               | iOS                                             |
| ----------------------- | --------------------- | ----------------------------------------------- |
| `development`           | APK with dev tools    | Registered iPhones (ad hoc), with dev tools     |
| `development-simulator` | —                     | iOS Simulator on a Mac, with dev tools          |
| `preview`               | Installable APK       | Registered iPhones (ad hoc)                     |
| `preview-simulator`     | —                     | iOS Simulator on a Mac, no Apple account needed |
| `production`            | Play Store app bundle | App Store / TestFlight                          |

Development and preview builds use the mock API; production points at the real API.

**iOS needs a paid Apple Developer account** (US$99/year) for any build that installs on a real
iPhone. For ad hoc builds, register each test iPhone first with `npx eas-cli@latest device:create`
(max 100 devices a year). TestFlight builds use the `production` profile plus
`npx eas-cli@latest submit -p ios`. Simulator builds need no Apple account.
