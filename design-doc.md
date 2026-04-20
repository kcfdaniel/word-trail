# WordTrail — Technical Design

**Project:** WordTrail
**Framework:** Nuxt 4
**PWA Module:** `@vite-pwa/nuxt`
**Platform:** Progressive Web App (Web Speech API) — installable on iOS and Android home screens
**Version:** 1.0 (MVP, no auth)

## 1. Core Architecture

WordTrail is a single-page interface: a "Source Text" is rendered, and a live transcript from the Web Speech API is mapped onto it in real-time, highlighting the active word and everything the user has already read.

- **UI layer (Nuxt 4 + Nuxt UI 4):** renders the script and drives highlighting.
- **Persistence:** `localStorage` via `@vueuse/core`'s `useStorage`. Scripts are rich-text HTML documents (not plain strings).
- **Offline:** service worker via `@vite-pwa/nuxt` caches the shell so the UI loads without a network.
- **Install:** PWA manifest + custom install prompt. On iOS/Android, installing to the home screen gives a standalone window and better mic stability than a browser tab.
- **No backend, no auth, no account.**

### PWA configuration

The theme color is dark (`#1a1a1a`), background is `#faf8f5`, display is `standalone`, and orientation is locked to portrait. `registerType: 'autoUpdate'` so users pick up new versions on the next launch.

## 2. Script Data Model

Scripts are stored as rich-text HTML to preserve author formatting:

```ts
interface Script {
  id: string
  title: string
  contentHtml: string
  createdAt: number
  updatedAt: number
}
```

For matching and highlighting, the HTML is walked with `TreeWalker` to produce a flat index of word positions, each pointing back at its text node and character range. This is what lets us highlight individual words without modifying the DOM.

```ts
interface WordPosition {
  index: number
  text: string
  normalizedText: string
  node: Text
  start: number
  end: number
}
```

## 3. Speech Recognition (`useSpeech`)

Thin wrapper around `SpeechRecognition` / `webkitSpeechRecognition`:

- `continuous: true`
- `interimResults: true`
- `lang` is driven by the stored user selection (12 locales). I18n UI locale follows the speech locale via `setLocale`.
- `onresult` builds a running final transcript and an interim transcript.
- **2-second silence timeout** clears the interim buffer so stale partials don't bleed into later matches.
- **Auto-restart** on `onend` when `shouldRestart` is true — handles mobile STT's ~60s idle timeout transparently.
- Errors are classified:
  - **Silent** (`no-speech`, `aborted`): ignored.
  - **Fatal** (`not-allowed`, `service-not-allowed`, `audio-capture`, `language-not-supported`, `bad-grammar`): stop auto-restart and surface a translated message.
  - Other known codes get dedicated i18n strings; anything else falls through to a generic "unknown" message.

Confidence is captured on final results but is **not** currently used as a filter. (An earlier design called for dropping results below 0.4; this hasn't been needed in practice.)

## 4. Matching (`useSpeechMatch`)

The biggest challenge is that STT isn't 100% accurate ("the fast fox" vs. "the quick fox"), and the user may say filler words, skip words, or repeat themselves. The matcher has to keep the trail moving without jumping randomly.

### Pre-computation

When the script changes, `precomputeScript` walks the word list once and produces:

- `words[]` — every word with its normalized form.
- `significant[]` — the subset that are not stop words (`a`, `the`, `and`, `but`, `or`, `to`, `from`, `in`, `is`, `are`, `was`, `be`, …). CJK characters are never stop words.

Significant-word filtering is the key to stability: STT loves to drop or swap short function words, and ignoring them means a dropped "the" doesn't break the trail.

### Normalization

- Lowercase.
- Strip soft hyphens (`\u00AD`) and various dash characters.
- Keep Unicode letters, digits, and CJK ranges (`\u4e00-\u9fff`, `\u3040-\u309f`, `\u30a0-\u30ff`); drop everything else.

### Word splitting

CJK characters are split individually (one character = one word); everything else splits on whitespace. This mirrors how Web Speech API emits CJK transcripts.

### Two-stage matcher

**Stage 1 — Phrase matching on significant words (primary).**

Window: 2 significant words behind the last match, 15 ahead. For spoken phrases from length `min(spoken, 5)` down to `1`, search the window for an exact sequence match on significant-word strings. Score = `length × 10 − |originalIdDelta| − tie-breaker`. Early-exit once a 2+ word match is found.

Guards to avoid runaway jumps:
- Single-word matches cap jumps at 5 significant-word indices or 6 original indices.
- Matches shorter than 2 words cap forward-original delta at 20.

**Stage 2 — DP sequence alignment (fallback).**

If Stage 1 finds nothing, run a semi-global Needleman-Wunsch alignment of the spoken word sequence (up to last 20) against a window of script words (`currentIndex − 1` to `currentIndex + 20`):

- Match: +3
- Mismatch: −2
- Gap: −1
- Free gaps at window start (semi-global).

Word similarity inside the DP: equal after normalization, or prefix-of, or ≥75% positional character overlap. This is cheap by design — alignment is the hot path and we don't need Levenshtein-quality distance to pick up from a few garbled words.

Backtrack from the best column at row `n` to extract `lastMatchedArrayIdx` and `matchCount`. Accept the result only if:

- `matchCount ≥ 1` for any jump, and `matchCount > 1` or `jumpDistance ≤ 5`,
- match ratio `≥ 0.5`,
- average score per spoken word `≥ 1.0`.

### Short-transcript special cases

Spoken length 1 and 2 skip both stages and use exact match against the next 1–2 expected words. This prevents noisy single-word jumps early in the read.

## 5. Highlighting (`useRichTextHighlight`)

Uses the **CSS Custom Highlight API** (`CSS.highlights`, `Highlight`, `Range`), which applies styling to text ranges without touching the DOM. Two highlight groups:

- `wordtrail-completed` — everything before the current index.
- `wordtrail-active` — the current word.

This is the whole reason scripts are stored as rich-text HTML — the highlighter applies to whatever CKEditor produced (bold, italic, lists, headings) without mangling it.

State (`wordPositions`, `currentIndex`, container refs) is module-level so that `RichTextTeleprompter` (which builds the index) and `ScriptReaderOverlay` (which consumes matches) share the same reactive source. Without this, the reader overlay's instance stays empty and matching silently no-ops.

`handleMatch(matchIndex)` only applies forward movement or small rewinds (`≥ currentIndex − 3`) to stop noisy STT results from pulling the cursor backward.

Auto-scroll uses a computed range on the active word, measuring against the scroll container and scrolling smoothly so the active word sits near the vertical center.

## 6. Browser Support

CSS Custom Highlight API is supported in recent Chrome, Edge, and Safari. If `CSS.highlights` is missing, `useRichTextHighlight` reports `isSupported = false` and highlighting is skipped.

Web Speech API support varies: Chrome and Safari are the best bets on mobile. Installing the PWA to the home screen tends to give more reliable mic access than a tab.

## 7. Known Limitations

- **Mobile STT timeouts.** Handled via `shouldRestart` + `onend`. Errors classified as fatal (permission, audio capture, unsupported language) short-circuit restart so we don't loop on an unfixable failure.
- **Background noise** causes spurious short-word matches. The single/two-word exact-match rule and jump guards mitigate this; confidence-based filtering is not currently implemented.
- **Rewinds.** The matcher intentionally won't jump backward more than a few words — going back to an earlier position requires clicking on a word in the reader.

## 8. Not implemented (design intent vs. reality)

These were in the original design doc but are not in the current build:

- **Capacitor native builds** for iOS/Android. The app is PWA-only; there is no Capacitor dependency.
- **Confidence threshold filter** (<0.4 → drop). Confidence is captured but not filtered on.
- **Pure Levenshtein fuzzy matching.** Replaced with the two-stage significant-words + semi-global DP approach described above, which performs better on dropped stop words and repeated phrases.
