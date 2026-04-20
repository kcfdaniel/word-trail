# WordTrail

A real-time script reader that highlights words as you speak them. Load in a script, hit record, and WordTrail follows along — keeping the word you're saying centered on screen so you never lose your place.

Built as a Progressive Web App with Nuxt 4. Installs to your home screen on iOS and Android and works offline once loaded.

## Features

- **Live word tracking** — speech recognition maps your voice to the script in real-time, highlighting the active word and fading what you've already read
- **Tolerant matcher** — recovers gracefully when speech-to-text slips on filler words, homophones, or skipped words (see [How matching works](#how-matching-works))
- **Rich text scripts** — write and format scripts in a CKEditor-powered editor; highlights apply without disturbing your formatting (CSS Custom Highlight API)
- **12 languages** — English, Simplified/Traditional Chinese, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Russian, Dutch. CJK text is split per-character.
- **Auto-scroll** — the active word stays centered as you read
- **Dark mode** — theme-aware, including the mobile status bar
- **Installable PWA** — manifest + service worker for offline use and home-screen install
- **No account** — scripts live in your browser via `localStorage`, not a server

## Tech Stack

- [Nuxt 4](https://nuxt.com) + [Nuxt UI 4](https://ui.nuxt.com)
- [Tailwind CSS 4](https://tailwindcss.com)
- [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/) for PWA support
- [@nuxtjs/i18n](https://i18n.nuxtjs.org) for localization
- [CKEditor 5](https://ckeditor.com/ckeditor-5/) for the script editor
- Web Speech API for speech recognition
- CSS Custom Highlight API for non-destructive highlighting
- Vitest + Playwright for unit and e2e tests

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start the dev server at `http://localhost:3000`:

```bash
pnpm dev
```

The dev server binds to `0.0.0.0` so you can test on a phone on the same network — useful for verifying mic behavior on real devices.

## Scripts

```bash
pnpm build          # production build
pnpm preview        # preview the production build
pnpm lint           # eslint
pnpm typecheck      # vue-tsc
pnpm test           # vitest (unit + nuxt)
pnpm test:e2e       # playwright
pnpm test:e2e:ui    # playwright UI mode
```

## Project Layout

```
app/
  components/       # ScriptEditor, RichTextTeleprompter, ScriptReaderOverlay, …
  composables/      # useSpeech, useSpeechMatch, useScriptManager, useRichTextHighlight
  pages/            # index + scripts routes
  utils/            # id, languageMapping, richText
  assets/css/       # Tailwind entry
i18n/locales/       # 12 locale JSON files
public/             # PWA icons, static assets
test/               # vitest (unit + nuxt projects)
tests/              # playwright e2e
design-doc.md       # architecture notes
```

## How matching works

Speech-to-text isn't perfect, so the matcher doesn't require an exact transcript. It runs in two stages over a sliding window around the last matched word (2 words behind, 15 ahead):

1. **Phrase matching on significant words.** Common stop words (`a`, `the`, `and`, `to`, `in`, `is`, …) are filtered out of both the spoken transcript and the script. The matcher then searches the window for the longest phrase from the recent spoken words that appears in the script, scoring by phrase length and proximity to the expected position. Guards prevent it from jumping too far forward on a single-word match.

2. **DP sequence alignment fallback.** If phrase matching finds nothing, a semi-global Needleman-Wunsch-style alignment runs against the window — match +3, mismatch −2, gap −1 — with free gaps at the window start. The result is accepted only if the match ratio and per-word score clear minimum thresholds.

Word similarity within the DP pass is character-based (prefix match, or ≥75% positional overlap), not Levenshtein. This is deliberately cheap since alignment is the hot path.

Highlighting uses the **CSS Custom Highlight API** (`CSS.highlights` + `Highlight` + `Range`), so the DOM is never modified — rich-text formatting in scripts is preserved exactly as authored.

Speech recovery: a 2-second silence timeout clears the interim transcript to avoid stale partials bleeding into later matches, and `onend` auto-restarts the recognizer unless the user stopped it or a fatal error (permission denied, unsupported language, audio capture failure) occurred.

## Browser Support

Speech recognition uses the Web Speech API, which works best in Chrome, Edge, and Safari. For the most reliable mic access on mobile, install the PWA to your home screen rather than running it in a browser tab.

## License

[MIT](./LICENSE)
