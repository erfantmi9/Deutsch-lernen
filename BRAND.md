# Doch! brand

**Name:** Doch! (Persian: «دُخ»). **Mascot:** Deutschi (دویچی), a dachshund.
The wordmark's "o" holds Deutschi's face; the "!" is Deutschi standing, with a red ball as the dot.

## Colours

| Role | Hex |
| --- | --- |
| Mustard (brand background, theme colour) | `#F6C445` |
| Ink (wordmark, text on mustard) | `#2B2118` |
| Coat | `#A0612B` |
| Ears | `#6B3E1C` |
| Muzzle | `#D9A066` |
| Collar / ball | `#E4572E` |

Text on mustard is always Ink, never white (white on mustard fails contrast).

## Type

Wordmark: Baloo 2 ExtraBold, outlined to paths (no font needed). Persian: Vazirmatn Bold.

## Files (`public/brand/`)

| File | Use |
| --- | --- |
| `doch-logo.svg`, `doch-logo-2000.png` | Main logo, dark text, transparent |
| `doch-logo-white.svg`, `doch-logo-white-2000.png` | On dark backgrounds |
| `doch-logo-on-mustard.svg` | Logo on the brand background |
| `doch-icon.svg`, `doch-icon-1024.png` | App icon (rounded mustard tile) |
| `doch-mark.svg` | Face only, transparent |
| `icon-192.png`, `icon-512.png` | PWA icons (served at `/icon-192.png`, `/icon-512.png`) |
| `icon-maskable-512.png`, `doch-maskable.svg` | Android maskable icon (face inside the safe zone) |
| `apple-icon.png` | iOS home screen (also at `/apple-icon.png`) |
| `doch-playstore-512.png` | Google Play / Cafe Bazaar / Myket store icon |
| `doch-feature-graphic-1024x500.png` | Google Play feature graphic |
| `doch-avatar-1080.png` | Instagram / Telegram profile picture |
| `doch-og-1200x630.png` | Link preview card (served by `app/[locale]/opengraph-image.tsx`) |

`/favicon.ico` (16/32/48) and `/icon.svg` are in `public/`. The header wordmark is `components/Logo.tsx`, its paths in
`lib/brandWordmark.ts`.
