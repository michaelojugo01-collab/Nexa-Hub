# Nexa Hub

A Nigerian creator and seller marketplace. iOS and Android from one Expo codebase.

- Spec: [`docs/NEXA_HUB_Build_Specification.pdf`](docs/NEXA_HUB_Build_Specification.pdf)
- Decisions: [`docs/decisions.md`](docs/decisions.md)
- Project rules (for people and AI tools): [`CLAUDE.md`](CLAUDE.md)

## Getting started

Needs Node 22 (`.nvmrc`), pnpm 10 (`corepack enable`) and the **Expo Go** app on an Android phone.

```bash
pnpm install
pnpm dev          # scan the QR code with Expo Go (phone and computer on the same Wi-Fi)
```

The app runs against a **mock API** by default (`apps/mobile/.env`). To see other states, create
`apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_MOCK_DELAY_MS=3000      # slow network → loading skeletons
EXPO_PUBLIC_MOCK_FAILURE_RATE=1     # every request fails → error states
EXPO_PUBLIC_MOCK_SCENARIO=empty     # empty lists → empty states
```

Restart `pnpm dev` after changing env values (add `--clear` if they don't apply).

Profile → **Components** (development only) shows every component in every state.

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

## Builds (EAS, Android first)

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # installable APK
```

Profiles are in `apps/mobile/eas.json`: `development`, `preview` and `production`.
