# Decisions log

Newest first. Each entry: what was decided, why, and what would change it.

## 2026-11-28 — F0 front-end foundation

1. **pnpm workspaces with `node-linker=hoisted`.** Expo/Metro expects a flat `node_modules`.
   Metro needed no custom monorepo config with Expo SDK 58.
2. **Brand is black and white with chrome accents** (replaces the spec's red, black, gold).
   Chrome is a cool silver scale; the metallic shine uses `expo-linear-gradient` (approved)
   on chrome badges, verified-avatar rings and default store covers.
3. **Muted status colours** (green, amber, red) are kept for success, warning and error, for
   clarity and accessibility. Approved.
4. **Font: system font** (San Francisco / Roboto) until a brand font is chosen. TODO in
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
16. **EAS profiles:** development and preview use mocks (no backend yet); production points at
    `https://api.nexahub.ng` with mocks off. The development profile needs `expo-dev-client`,
    which is not installed yet (needs approval).
