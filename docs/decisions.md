# Decisions log

Newest first. Each entry: what was decided, why, and what would change it.

## 2026-11-28 — F3 Public web pages and deep links

1. **Proposed endpoints** (`x-status: proposed` in `openapi.yaml`, contract v0.4):
   - `slug` on products (`ProductSlug`, 3–60 characters, unique within a store, made from the
     title).
   - `GET /v1/stores/{storeSlug}/products/{productSlug}` → `Product` (summary + `description`,
     `images`, `storeInfo`, `publishedAt`, `redirectTo`). 404 for unpublished products and
     private stores; an old store slug returns the product with `redirectTo`.
   - `GET /v1/users/{username}` → `PublicProfile` (username, display name, avatar, bio, public
     store or null, member since). Never phone, email or interests.
   - `GET /v1/sitemap?cursor=&limit=` → `{ data: [{ type, path, updatedAt }], nextCursor }`,
     public stores and live products of public stores only.
2. **No web checkout, sign-in or buying** (Part 9 decision #3: not in the first build). The
   product page's main button is "Buy in the app".
3. **Private stores are 404 on the web** (not "This store is private" as in the app), with
   `noindex`, like unpublished products and unknown slugs. Old store slugs are a 308.
4. **"Open in app" on iOS (approved, option A):** tries `nexahub://{path}` and goes to the App
   Store after 1.5 s; iOS Safari also shows the Smart App Banner (`apple-itunes-app`). Reason:
   iOS doesn't open universal links for taps within the same site. Android: `intent://` with
   `scheme=https` and the Play Store as `browser_fallback_url`. Desktop: both store links.
5. **Referral codes:** `?ref=CODE` is read in the browser (pages stay cached), shown with
   Copy, kept on links, and sent to Google Play as `referrer=ref=CODE`. No Branch. The
   spec's fallback (ask for the code in onboarding) is an app change for later.
6. **Caching:** classic ISR (not Next 16 Cache Components, which would stream and could turn
   404/308 into 200s). Data reads go through `unstable_cache` with `site.revalidateSeconds`
   (60), which sets every page's revalidation; featured stores are prerendered at build.
7. **One placeholders file:** `packages/config/site.ts` (domain `nexahub.app`, App Store ID,
   Team ID, bundle ID, Play package, SHA-256 fingerprints, 60 s). The web, the app's store
   links and `apps/mobile/app.config.ts` import it. How to get real values:
   `docs/deep-links.md`.
8. **Shared code:** mock backend moved to `packages/mocks` (app and web read the same data);
   slug/upload/store rules to `@nexa/api-contract` (`rules.ts`); `formatKobo` to `@nexa/ui`.
9. **Web stack (approved):** Next.js 16.4.6 (App Router), Tailwind 3 with the same preset as
   NativeWind (colour variables written from `@nexa/ui` tokens), Vitest 5 for unit tests,
   `@playwright/test` 1.63.0 for a smoke test against the production build. System fonts
   (no web font download). Lighthouse is run with `npx`, not installed.
10. **Analytics:** `track()` in `apps/web/src/lib/analytics.ts` with `page_view`,
    `open_in_app_click`, `get_app_click`, `ref_code_copied`; logs to the console in mock mode
    (`NEXT_PUBLIC_ANALYTICS=mock`). PostHog later behind the same function (ask first).
11. **App side:** `+native-intent` maps web links to routes; placeholder product screen (F4
    replaces it) and public profile screen; web route names added to the reserved slugs.
12. **Known limits:** Android App Links claim every path on the domain; an old store link with
    `?ref=` loses the code on the 308; client JavaScript is ~136 KB, almost all Next.js's own
    runtime (our islands: banner, buttons, ref box, page view). Once, in the smoke test, a
    redirect served while two requests rendered it at the same moment carried a duplicated
    (identical) `Location` header; not reproducible since — watch on Vercel.

## 2026-11-28 — F2 Stores and profiles (front end)

1. **Proposed endpoints** (not in the spec's list; `x-status: proposed` in `openapi.yaml`):
   - `DELETE /v1/stores/{id}/follow` → `{ storeId, following, followerCount }` (unfollow; the
     spec lists follow and unfollow but only `POST`). Follow and unfollow are idempotent.
   - `GET /v1/slugs/availability?slug=` → `{ slug, available, reason }`, reason
     `taken | reserved | invalid`. Advisory; `POST`/`PATCH /v1/stores` re-check. Kept off
     `/v1/stores/...` so it can't clash with a store slug.
   - `GET /v1/me/store` → the seller's own store with owner-only fields
     (`slugChangesRemaining`, `previousSlug`), private stores included; 404 = no store yet.
     The Store tab uses it to choose setup vs dashboard.
   - `POST /v1/me/store/uploads` `{ kind: avatar|banner, contentType, sizeBytes }` → a
     pre-signed `PUT` (`uploadId, uploadUrl, method, headers, expiresAt, maxBytes`). The app
     uploads straight to storage, then sends `avatarUploadId` / `bannerUploadId` (null removes)
     with `POST`/`PATCH /v1/stores`. The server returns the resized images on the store as
     `avatar` / `banner` `{ small, medium, large }`; there is no separate "processing" endpoint.
2. **Upload limits (proposed):** JPEG, PNG or WebP; avatar **5 MB**, banner **10 MB**
   (`FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`). The app also crops, shrinks (avatar 800×800,
   banner 1500×500) and re-encodes as JPEG (quality 0.8) on the phone first, so a typical
   upload is a few hundred KB; HEIC photos from iPhones work because they are re-encoded.
3. **Contract additions to `Store`:** `category`, `avatar`, `banner`, `visibility`,
   `isOwner` (server decides ownership), `redirectTo` (set when an old slug was requested; the
   app replaces the route). `avatarUrl`/`coverUrl` stay for F0 screens. New error codes:
   `SLUG_TAKEN`, `SLUG_RESERVED`, `SLUG_INVALID`, `SLUG_CHANGE_USED`, `STORE_EXISTS`,
   `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, plus `STORE_PRIVATE` (403, so the page can say
   "This store is private" instead of "not found"), `NOT_SELLER` (403) and
   `CANNOT_FOLLOW_OWN_STORE` (409).
4. **Slug rules:** 3–30 characters, `a–z`, `0–9` and single hyphens, starting and ending with
   a letter or number (the contract's `Slug` pattern was tightened from 32 to 30). Changed
   once; the old slug keeps redirecting and stays taken. The reserved list lives on the server;
   the mock's list includes platform words, every top-level app route (store links share the
   URL space: `nexahub.app/{slug}`), and a few well-known Nigerian creators and brands to stand
   in for the impersonation list. The admin claim process is not built (backend + F12).
5. **Link domain is a placeholder:** `nexahub.app`, in one constant
   (`apps/mobile/src/lib/store-links.ts`). Change it there when the domain is decided.
6. **Deep links:** `nexahub://store/{slug}` opens `/store/[slug]`; a root `[slug]` route
   redirects `/{slug}` to the same screen, ready for https links in F3. Store pages are open
   to signed-out visitors (not during onboarding). Follow while signed out → sign in → back to
   the store (after onboarding for new accounts).
7. **Libraries (approved):** `react-native-qrcode-svg` + `react-native-svg` (QR code, exported
   as PNG and shared through the OS sheet, which also offers "Save image"), `expo-clipboard`,
   `expo-sharing`, `expo-file-system` (PNG file for sharing, size check, upload with progress
   via `File.upload`), `expo-image-manipulator`. **Banner crop:** our own crop screen (pinch and
   drag in a 1:1 or 3:1 frame, gesture-handler + reanimated) instead of
   `react-native-image-crop-picker`: same on iOS and Android, works in Expo Go, no extra
   native dependency. No rotation or free-form crop. `expo-media-library` ("Save to Photos")
   was declined.
8. **Feature flags:** `useFeatureFlag(key)` reads local defaults in `src/lib/flags.ts`, with
   Dev settings overrides; shaped to swap for PostHog. `servicesTab` (off) is the first flag.
9. **Payout reminder** dismissal is remembered on the device (secure storage, cleared on
   sign-out). Payouts (F7) and adding products (F4) are placeholder screens.
10. **Store setup draft is in memory only:** closing the app mid-setup starts again.
11. **Mock behaviour:** stores and follows persist under their own mock-only secure-store key;
    uploads are simulated with progress (3× the mock delay) and fail about 1 in 6 times
    (`EXPO_PUBLIC_MOCK_UPLOAD_FAILURE_RATE`); the "processed" variants all point at the
    seller's own compressed file so they see their photo.

## 2026-11-28 — F1 Accounts and authentication (front end)

1. **Proposed endpoints** (not in the spec's list; marked `x-status: proposed` in
   `openapi.yaml`, backend to confirm):
   - `GET /v1/usernames/availability?username=` → `{ username, available, reason }`,
     reason `taken | reserved | invalid`. Advisory; `PATCH /v1/me` re-checks.
   - `POST /v1/me/email/verification` → 202 `{ sentTo }` (re-send the link).
   - `DELETE /v1/me` with `{ confirmation: "DELETE" }` → 202 `{ deactivatedAt, deletesAt }`.
   - `POST` and `GET /v1/me/data-export` → `{ status: none|requested|ready, requestedAt }`.
2. **Account deletion (approved):** deactivate and sign out everywhere now, delete
   permanently after 30 days, signing in within 30 days cancels; records the law requires
   (orders, ledger) are kept. Final wording needs a lawyer (F13).
3. **Interest tags come from `GET /v1/discover/categories`** (approved; already in the spec's
   discovery group). `Me.interests` holds up to 3 category slugs.
4. **OTP shape:** `/otp/request` returns a `challengeId` (plus masked `sentTo`, `expiresAt`,
   `resendAvailableAt`); `/otp/verify` takes `{ challengeId, code, deviceId }`. Requesting a
   new code invalidates the old one; the 60-second cooldown is per destination, so switching
   SMS → WhatsApp also waits for it. Remaining attempts are in the error `message` (the error
   object stays `{ code, message }`).
5. **Tokens:** 401 `ACCESS_TOKEN_EXPIRED` triggers one shared refresh and one retry; any
   refused refresh signs out; a refresh that fails for network reasons keeps the session.
   Refresh tokens are device-bound (random per-install `deviceId` in secure storage) and
   rotate; reusing an old one revokes all sessions.
6. **Storage:** tokens, cached `/v1/me`, device ID, lock settings and the PIN live in
   `expo-secure-store` behind `lib/auth/keychain.ts` (in-memory only on web previews; never
   AsyncStorage/localStorage). The cached profile lets the app open signed-in and offline.
   **Known iOS behaviour:** the Keychain survives uninstall, so a reinstalled app can come back
   signed in. Fix later with a first-launch marker once we have non-secure storage.
7. **Mock backend persistence:** the mock server saves its users and sessions under a
   separate mock-only secure-store key so "restart keeps me signed in" works in mock mode.
8. **Onboarding:** required step is name + username; email, photo and interests are
   skippable. The onboarding flag is UI flow state only; access is decided by the session.
   A skipped email shows a reminder card on Profile (no push reminder yet).
9. **Profile photo is local only** (expo-image-picker, square crop, no permission prompt
   needed for the library); upload arrives with media uploads. Camera and microphone
   permissions are disabled in the config plugin.
10. **App lock:** optional biometric (OS passcode fallback) or 4-digit PIN stored in secure
    storage. Locks on cold start and after > 5 minutes in the background
    (`EXPO_PUBLIC_APP_LOCK_AFTER_SEC`). 5 wrong PINs sign out; the counter survives restarts.
    Face ID needs a development build (Expo Go falls back to the passcode).
11. **Android SMS auto-read (approved): local Expo module `modules/sms-retriever`** wrapping
    Google's SMS Retriever API (zero-tap, no SMS permission). The backend must end each OTP
    SMS with the app's 11-character hash (shown in Dev settings on an Android development
    build). Uses `play-services-auth-api-phone` 18.1.0 and `androidx.core` 1.13.1 — versions
    not re-checked (Google Maven was unreachable) and **the Kotlin has not been compiled yet**:
    the first Android development build is its first compile. iOS uses the OS one-time-code
    autofill.
12. **Library added (approved): `@hookform/resolvers`** for react-hook-form + zod.
13. **Testing:** `expo-router/testing-library` drives the full new-user flow through the real
    router; Jest maps CSS to a stub and transforms `standard-navigation`.
14. **Platform fee copy** ("5% + ₦10 per sale") appears in the Become a seller sheet as
    information only; it must come from the server once a fees endpoint exists.

## 2026-11-28 — expo-dev-client added

1. **`expo-dev-client` installed** (approved) so the `development` and `development-simulator`
   EAS profiles produce development builds on iOS and Android.
2. **`pnpm dev` stays on Expo Go** (`expo start --go`); `pnpm dev:client` targets development
   builds. With expo-dev-client installed, plain `expo start` would default to development
   builds, which nobody has installed yet. Switch `pnpm dev` to development builds once we add
   a native library Expo Go doesn't include (e.g. react-native-pdf from the spec).

## 2026-11-28 — Build for iOS and Android equally

1. **iOS and Android are both first-class from now on** (replaces "Android first" in the spec's
   F0 card). Every change is checked on both: Jest runs each test under `jest-expo/ios` and
   `jest-expo/android`, and both bundles must build.
2. **EAS profiles:** added `development-simulator` and `preview-simulator` (iOS Simulator
   builds need no Apple account). `development` and `preview` produce ad hoc iOS builds for
   registered iPhones. TestFlight uses `production` + `eas submit`. A shared `base` profile
   holds the mock env.
3. **iPhone only for now** (`ios.supportsTablet: false`, Expo's default). Supporting iPad
   means designing tablet layouts; revisit after launch.
4. **`ios.config.usesNonExemptEncryption: false`.** The app only uses standard HTTPS, which
   is exempt, so TestFlight/App Store uploads skip the export-compliance question. Revisit if
   we add custom encryption.
5. **Needs from the owner before real iOS builds:** an Apple Developer Program membership,
   the final bundle ID (placeholder `ng.nexahub.app`), and test iPhones registered with
   `eas device:create`.

## 2026-11-28 — F0 front-end foundation

1. **pnpm workspaces with `node-linker=hoisted`.** Expo/Metro expects a flat `node_modules`.
   Metro needed no custom monorepo config with Expo SDK 58.
2. **Brand is black and white with chrome accents** (replaces the spec's red, black, gold).
   Chrome is a cool silver scale; the metallic shine uses `expo-linear-gradient` (approved)
   on chrome badges, verified-avatar rings and default store covers.
3. **Muted status colours** (green, amber, red) are kept for success, warning and error, for
   clarity and accessibility. Approved.
4. **Font: system font** (San Francisco / Roboto) until a brand font is chosen (owner will pick one soon). TODO in
   `packages/ui/src/typography.ts`.
5. **NativeWind v4 (4.2.x, latest stable)** rather than Tamagui. The `@nexa/ui` Tailwind preset
   _replaces_ Tailwind's default colours, spacing, radius and font sizes, so only token classes
   exist. Semantic colours are CSS variables set by `ThemeProvider`, so dark mode is a second
   palette, not a rewrite. Limitation: opacity modifiers like `bg-primary/50` don't work with
   these variables; add a token instead.
6. **Mock layer = injected `fetch` in the typed client**, not MSW or Prism. MSW needs polyfills
   in React Native and Prism needs a separate server; an injected fetch runs everywhere
   (device, web, Jest) and still exercises the real client and generated types. Revisit if we
   need contract validation of responses (Prism) for the backend.
7. **Typed client is hand-written** over the `openapi-typescript` types (one method per
   operation) rather than adding `openapi-fetch` or Orval. Revisit when the contract grows
   past ~20 operations.
8. **`GET /v1/discover/home` is not paginated.** It returns fixed sections capped at 10 items;
   "see all" uses paginated endpoints. Documented exception to "every list is paginated".
9. **Offline detection: `expo-network`** (approved), wired into TanStack Query's
   `onlineManager`. Queries retry only retryable errors (network, timeout, 5xx, 429), max 2.
10. **Icons: `@expo/vector-icons` (Ionicons)**, part of the Expo SDK.
11. **Sheet and Toast are built in-house** (React Native `Modal`; Zustand store) to avoid
    extra libraries. Swap for a gesture-driven sheet only if a screen needs drag-to-resize.
12. **Testing: Jest (`jest-expo`) + React Native Testing Library 14.** RNTL 14 needs its peer
    `test-renderer`. Reanimated's own Jest resolver is used.
13. **App identifiers `ng.nexahub.app`** (Android package and iOS bundle ID) are placeholders.
    **Confirm before the first store build**; they cannot change after publishing.
14. **Expo template extras removed** (`@expo/ui`, `expo-glass-effect`, `expo-symbols`,
    `expo-web-browser`, `expo-device`). Web export is a single-page app (`web.output: single`).
15. **The spec PDF is committed** to the repository at the owner's request, although it is
    marked confidential and the repository is public.
16. **EAS profiles** (superseded by the iOS entry above): development and preview use mocks (no backend yet); production points at
    `https://api.nexahub.ng` with mocks off. The development profile needs `expo-dev-client`,
    which is not installed yet (needs approval).
