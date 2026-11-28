# Deep links: universal links (iOS) and App Links (Android)

Public links look like `https://nexahub.app/{store}`, `https://nexahub.app/{store}/{product}`
and `https://nexahub.app/@{username}`. When the app is installed they open it on the right
screen; otherwise the web page (apps/web) opens with "Open in app" and "Get the app".

All values below live in **one file: `packages/config/site.ts`**. The web, the app and the Expo
config (`apps/mobile/app.config.ts`) read it, so changing a value there changes it everywhere.

| Value                        | Placeholder now  | Used for                                   |
| ---------------------------- | ---------------- | ------------------------------------------ |
| `domain`                     | `nexahub.app`    | Links, canonical URLs, associated domains  |
| `ios.appStoreId`             | `0000000000`     | Smart App Banner, App Store link           |
| `ios.teamId`                 | `ABCDE12345`     | apple-app-site-association                 |
| `ios.bundleId`               | `ng.nexahub.app` | Must match `app.json` ios.bundleIdentifier |
| `android.package`            | `ng.nexahub.app` | assetlinks.json, intent:// links, Play     |
| `android.sha256Fingerprints` | `00:00:…`        | assetlinks.json                            |

## How it fits together

- **Web** serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
  (route handlers in `apps/web/src/app/.well-known/`, built by `src/lib/well-known.ts`): status
  200, `Content-Type: application/json`, no redirects.
- **App config** (`apps/mobile/app.config.ts`): iOS `associatedDomains`
  (`applinks:` and `webcredentials:`) and an Android `intentFilters` entry with
  `autoVerify: true` for `https://{domain}` and `https://www.{domain}`.
- **App routing** (`apps/mobile/src/app/+native-intent.tsx` → `src/lib/incoming-link.ts`):
  `/{store}` → store screen, `/{store}/{product}` → product screen (placeholder until F4),
  `/@{user}` → profile screen (placeholder). The same paths work with `nexahub://`.
  Unknown links open Home. `?ref=CODE` is kept on the route.
- **Store slugs never clash with site pages:** the reserved list (mock:
  `packages/mocks/src/fixtures/stores.ts`; real list on the server) includes every app route
  and web file name (`sitemap.xml`, `robots.txt`, `.well-known`, `about`, `terms`, `privacy`,
  `download`, …).

## Getting the real values

### Apple Team ID

1. Join the Apple Developer Program (organisation account needs a D-U-N-S number, Part 9).
2. developer.apple.com → **Account → Membership details → Team ID** (10 characters).
3. Put it in `ios.teamId`. After the app is in App Store Connect, put its numeric **Apple ID**
   (App Store Connect → the app → App Information) in `ios.appStoreId`.
4. EAS adds the Associated Domains capability to the App ID when it builds with
   `associatedDomains` set (`eas build` manages capabilities automatically).

### Android signing SHA-256 fingerprints

You need every certificate that can sign an APK users install:

1. **EAS upload/app signing key:** `npx eas-cli@latest credentials -p android` → pick the
   build profile → **Keystore** → it prints `SHA256 Fingerprint`. Development and preview builds
   use this key too (unless you set up separate keystores).
2. **Google Play app signing key** (once the app is on Play): Play Console → the app →
   **Test and release → App integrity → App signing** → "App signing key certificate" →
   SHA-256. Play re-signs uploads with this key, so it must be in the list.
3. Put all of them in `android.sha256Fingerprints` (format `AA:BB:…`, 32 pairs).

### Domain

When the domain is decided: change `domain`, deploy the web there (HTTPS, no redirect on
`/.well-known/*`), then rebuild the app (`associatedDomains` and intent filters are native
config, so this needs a new build, not an OTA update).

## Testing on an Android development build

Needs a phone or emulator with a development build installed (`eas build --profile development
--platform android`, or `npx expo run:android`), built **after** the real fingerprint and
domain are in `site.ts` and the web is deployed on that domain.

```bash
# 1. Check the site files (must be 200, application/json, no redirect)
curl -sI https://nexahub.app/.well-known/assetlinks.json

# 2. Ask Android to verify the domain, then read the result
adb shell pm verify-app-links --re-verify ng.nexahub.app
adb shell pm get-app-links ng.nexahub.app          # want: nexahub.app: verified

# 3. Open links as if tapped in WhatsApp
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE \
  -d "https://nexahub.app/adaezeprints"
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE \
  -d "https://nexahub.app/adaezeprints/ankara-print-pattern-pack-40-designs"
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE \
  -d "https://nexahub.app/@adaeze"

# 4. "Open in app" on the web page (Chrome on the phone): opens the app when installed;
#    uninstall the app and tap again: Chrome goes to the Play Store listing.
```

Before the real domain exists you can still test the in-app mapping with the scheme:
`adb shell am start -W -a android.intent.action.VIEW -d "nexahub://adaezeprints/adire-textile-mockups"`
(or `npx uri-scheme open "nexahub://@adaeze" --android`).

If verification fails: `adb shell pm get-app-links` shows `1024` (no match) or `legacy_failure`
— the fingerprint or package in assetlinks.json doesn't match the installed build, or the file
redirects. Google's checker: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://nexahub.app&relation=delegate_permission/common.handle_all_urls`.

## Testing on iOS

Universal links need the real Team ID, a domain serving the AASA file, and a build with the
entitlement. Apple's CDN caches the AASA file; for development builds add `?mode=developer` to
the entitlement (`applinks:nexahub.app?mode=developer`) and enable Settings → Developer →
Associated Domains Development. Test by tapping a link in Notes or Messages (typing it in
Safari's address bar does not open the app). On the web page, "Open in app" tries
`nexahub://…` and goes to the App Store after 1.5 s if the app didn't open (decision F3-2).

## Known limits

- **Same-site taps on iOS:** tapping a `nexahub.app` link while already on `nexahub.app` in
  Safari stays in Safari (Apple's rule). That is why the iOS "Open in app" button uses the
  app scheme (see above).
- **Android claims every path** on the domain (intent filters can't exclude paths the way
  the AASA file can); odd links such as `/robots.txt` open the app's Home.
- **Referral codes don't survive an install** without a vendor such as Branch (spec F3). The
  web shows "Use code CODE when you sign up"; the Play Store link carries
  `referrer=ref=CODE` so a later app version could read it with the Play Install Referrer API.
- **Old slug + ?ref:** an old store link redirects (308) to the new one without the query
  string, so a ref code on an old link is dropped.
