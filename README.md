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

**Stores (F2) with mocks:** sign in as the buyer, tap Store → Become a seller → Set up my store
(about a minute). Fixture stores to open: `adaezeprints` (owned by the seller account),
`jollofacademy`, `kolacreates`, `lensbyemeka` (private), `adaezestudio` (old link that
redirects to `adaezeprints`). About 1 in 6 photo uploads fail on purpose so you can see Retry
(`EXPO_PUBLIC_MOCK_UPLOAD_FAILURE_RATE`; Dev settings can make every upload fail). Dev settings
also turns on the Services tab flag.

### Testing store links (deep links)

The app scheme is `nexahub`. With the app running on a simulator, emulator or USB device:

```bash
npx uri-scheme open "nexahub://store/jollofacademy" --ios       # iOS simulator
npx uri-scheme open "nexahub://store/jollofacademy" --android   # Android emulator/device
npx uri-scheme open "nexahub://store/adaezestudio" --ios        # old slug → replaced by adaezeprints
npx uri-scheme open "nexahub://jollofacademy" --android         # /{slug} form (future https links)
```

In **Expo Go** the scheme is Expo Go's own, so use the URL the dev server prints, e.g.
`npx uri-scheme open "exp://192.168.1.10:8081/--/store/jollofacademy" --ios`. Without
`uri-scheme`: `xcrun simctl openurl booted "nexahub://store/jollofacademy"` (iOS) or
`adb shell am start -W -a android.intent.action.VIEW -d "nexahub://store/jollofacademy"` (Android).
`https://nexahub.app/{slug}` links (universal / app links) are set up with the web pages in F3.

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
                       src/features = screen code)
apps/web               Next.js public pages: /{store}, /{store}/{product}, /@{user} (F3)
apps/api|admin         not started
packages/api-contract  openapi.yaml, generated types, typed client, shared rules
packages/mocks         mock backend: fixtures + fake API, used by the app, the web and tests
packages/ui            design tokens, Tailwind preset, formatKobo
packages/config        ESLint, Prettier, tsconfig, site.ts (domain, store IDs: placeholders)
docs/                  spec, decisions log, deep-links.md
```

## Public web pages (apps/web)

Read-only Next.js site: link previews for WhatsApp/Instagram/TikTok and a way into the app.
No sign-in and no buying on the web.

```bash
pnpm --filter @nexa/web dev          # http://localhost:3000/adaezeprints
pnpm --filter @nexa/web build && pnpm --filter @nexa/web start
pnpm --filter @nexa/web test         # Vitest unit tests (also run by pnpm test)
pnpm --filter @nexa/web test:smoke   # Playwright against the production build (build first)
```

`apps/web/.env`: `USE_MOCKS=true` reads the shared mock data; set `USE_MOCKS=false` and
`API_URL` for the real API. Try `/adaezeprints`, `/adaezestudio` (old slug → 308),
`/lensbyemeka` (private → 404), `/adaezeprints/ankara-print-pattern-pack-40-designs?ref=ADA25`,
`/@adaeze`, `/sitemap.xml`, `/.well-known/assetlinks.json`.

**Vercel previews:** vercel.com → Add New → Project → import this GitHub repo → **Root
Directory: `apps/web`** (framework Next.js, pnpm detected; keep "Include files outside the
root directory" on). Every push then gets a preview URL. To check a link preview, paste a
product URL from the preview into WhatsApp. Run PageSpeed Insights on the same URL.

Deep links (universal links / App Links), the real IDs to fill in, and testing on an Android
dev build: [`docs/deep-links.md`](docs/deep-links.md).

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
