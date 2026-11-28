# Nexa Hub — project rules

Nigerian creator/seller marketplace for **iOS and Android** (one Expo codebase; web is only for
public links and admin later). Source of truth: `docs/NEXA_HUB_Build_Specification.pdf`
and `packages/api-contract/openapi.yaml`. Never invent features or endpoints. Decisions go in
`docs/decisions.md`. Expo-specific guidance: `apps/mobile/AGENTS.md`.

## Stack and layout (pnpm workspaces, `node-linker=hoisted`)

| Path                                 | What                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `apps/mobile`                        | Expo + TypeScript (strict) + Expo Router. Routes in `src/app/`, everything else outside it |
| `apps/api`, `apps/admin`, `apps/web` | Not started                                                                                |
| `packages/api-contract`              | `openapi.yaml` → generated types (`src/generated/`) + thin typed client                    |
| `packages/ui`                        | Design tokens (colours, spacing, radius, type) + Tailwind preset                           |
| `packages/config`                    | Shared ESLint, Prettier, tsconfig                                                          |

App libraries: TanStack Query, Zustand, react-hook-form + zod, NativeWind, FlashList, expo-image,
expo-network, expo-linear-gradient, @expo/vector-icons, expo-dev-client, expo-secure-store,
expo-local-authentication, expo-image-picker, @hookform/resolvers, expo-image-manipulator,
expo-clipboard, expo-sharing, expo-file-system, react-native-svg, react-native-qrcode-svg. Local native module:
`apps/mobile/modules/sms-retriever` (Android). **No new libraries without asking first.**

Commands (root): `pnpm dev` (Expo Go), `pnpm dev:client` (development build), `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm generate:api`.
Add app packages with `npx expo install <pkg>` inside `apps/mobile`.

## Engineering rules

- Money is integer **kobo** (`amountKobo`), never a decimal. NGN only. Format with `formatKobo`/`PriceText`.
- The app never decides money or access. It only shows what the server returns. No client-side price/fee maths.
- Every list endpoint is cursor-paginated: `{ data, nextCursor }`.
- Every screen handles **loading, empty, error and offline** states.
- **Build for iOS and Android equally.** Check every change on both: tests run per platform
  (`jest-expo/ios` + `jest-expo/android`), both bundles must build, and platform-specific code uses
  `Platform.select` or `.ios.tsx`/`.android.tsx` files with both sides implemented.
- Release modules (R1–R13) go behind feature flags: `useFeatureFlag(key)` from `src/lib/flags.ts`.
- No secrets in the app. `EXPO_PUBLIC_*` values are public.
- Never hand-edit `packages/api-contract/src/generated/`. Change `openapi.yaml`, run `pnpm generate:api`.
- No hard-coded colours or sizes in components: use token classes (`bg-surface`, `text-text-muted`, `p-4`)
  or `useTheme()` for props that cannot take a class. Only the 15 core components until a screen needs more.
- Nothing touching the ledger, payouts, auth or webhooks merges without tests and a human review.

## Conventions

- Files: components `PascalCase.tsx`; hooks `use-thing.ts`; other modules `kebab-case.ts`;
  screen code in `src/features/<area>/`, route files only re-export it.
- Every component takes `testID` and has accessibility labels. testIDs are `kebab-case`
  (`home-error-retry`).
- Query keys only from `src/lib/api/query-keys.ts`; one hook per endpoint (`use-discover-home.ts`).
- Errors: API calls only throw `ApiError { status, code, message }`. `code` is UPPER_SNAKE
  (`NOT_FOUND`, `NETWORK_ERROR`). Screens show `ErrorState` (offline variant when offline) with retry;
  show the server's `message`, never raw exceptions. Background refresh failures → toast, keep data.
- Auth: use `api` (attaches the token, refreshes once on 401) for user endpoints and `publicApi`
  for OTP/refresh/logout. Session data only via `lib/auth/secure-storage.ts` (expo-secure-store);
  never AsyncStorage. Write `/v1/me` results with `applyMe()` so the store and cache agree.
  Never compute roles or access client-side (`isSeller()` only reads `user.roles`).
- Logging: `logger.sensitive()` for codes, tokens and phone numbers (prints only in mock mode).
- Mocks: fixtures in `apps/mobile/src/mocks/fixtures`, reused by tests. `EXPO_PUBLIC_USE_MOCKS=true`
  answers requests from `src/mocks/handlers.ts`.

## Workflow

- One module at a time. Restate the goal, list screens, states, endpoints and what is out of scope,
  then **wait for approval** before building.
- Contract first: update `openapi.yaml`, generate, build against mocks, then the real API.
- Small commits, one working step each. Run `pnpm typecheck && pnpm lint && pnpm test` before every commit.
