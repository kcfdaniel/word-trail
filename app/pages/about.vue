<script setup lang="ts">
definePageMeta({
  layout: 'content',
})

const title = 'About WordTrail — A voice-activated teleprompter for the browser'
const description = 'WordTrail is a free, open-source script-reading tool that uses speech recognition to highlight words as you say them. Built as a Progressive Web App.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: 'https://wordtrail.web.dev/about',
})
</script>

<template>
  <article class="content-page">
    <header class="content-page-header">
      <p class="content-page-eyebrow">
        About
      </p>
      <h1 class="content-page-title">
        Speak naturally. <br><span class="accent">It follows you.</span>
      </h1>
      <p class="content-page-lede">
        WordTrail is a real-time script reader that highlights words as you say them.
        Load in a script, hit record, and the active word stays centered on screen so
        you never lose your place.
      </p>
    </header>

    <section class="content-page-section">
      <h2>Why WordTrail exists</h2>
      <p>
        Reading from a script is harder than it looks. Whether you're rehearsing a wedding
        speech, recording a podcast, narrating a video, or running through presentation notes,
        the moment you glance away or stumble over a word, you lose your place. Conventional
        teleprompter apps make you scroll at a fixed pace and force you to keep up. That's
        backward — the script should keep up with you, not the other way around.
      </p>
      <p>
        WordTrail listens to your voice in real time and tracks where you are in the script.
        When you slow down, it slows down. When you skip ahead, it catches up. When the
        speech recognizer mishears a word, the matcher recovers gracefully and keeps the
        highlight where it should be.
      </p>
    </section>

    <section class="content-page-section">
      <h2>How it works</h2>
      <p>
        The matching engine has two stages, both running over a sliding window around the
        last matched word:
      </p>
      <ul>
        <li>
          <strong>Phrase matching on significant words.</strong> Common stop words like
          <em>a</em>, <em>the</em>, <em>and</em>, <em>to</em> are filtered out of both your
          spoken transcript and the script. The matcher then searches for the longest
          phrase from your recent speech that appears in the script, scoring by phrase
          length and proximity to where you should be.
        </li>
        <li>
          <strong>Sequence alignment fallback.</strong> If phrase matching finds nothing,
          a Needleman-Wunsch-style alignment runs against the window. Word similarity is
          character-based — prefix match, or 75%+ positional overlap — chosen for speed.
          The result is accepted only if it clears minimum match thresholds.
        </li>
      </ul>
      <p>
        Highlighting uses the
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API"
          target="_blank"
          rel="noopener noreferrer"
        >CSS Custom Highlight API</a>,
        which means rich-text formatting in your scripts is preserved exactly as you
        authored it. Nothing in the DOM is mutated — the highlight is purely a paint-layer
        effect on top of the existing text.
      </p>
    </section>

    <section class="content-page-section">
      <h2>What it's good for</h2>
      <ul>
        <li>
          <strong>Speeches and presentations</strong> — keynotes, weddings, eulogies,
          best-man toasts, conference talks, Toastmasters practice.
        </li>
        <li>
          <strong>Video and podcast narration</strong> — read scripts naturally without
          forcing your pace to match a scrolling teleprompter.
        </li>
        <li>
          <strong>Voiceover work</strong> — keep your eye on the next word, not on
          re-finding your place after a take.
        </li>
        <li>
          <strong>Language practice</strong> — read aloud in any of 12 supported languages
          and watch your pronunciation map to text in real time.
        </li>
        <li>
          <strong>Accessibility</strong> — for readers who benefit from word-level visual
          tracking while reading aloud.
        </li>
      </ul>
    </section>

    <section class="content-page-section">
      <h2>Languages</h2>
      <p>
        WordTrail supports 12 languages: English, Simplified Chinese, Traditional Chinese,
        Spanish, French, German, Italian, Portuguese (Brazil), Japanese, Korean, Russian,
        and Dutch. CJK languages (Chinese, Japanese, Korean) are tokenized per-character
        because there are no word boundaries to lean on.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Privacy by design</h2>
      <p>
        WordTrail does not run a server. There is no account to create. Your scripts live
        in your browser's <code>localStorage</code> on your own device — nothing is uploaded.
        Microphone audio is processed by your browser's built-in speech recognition service;
        WordTrail only ever sees the recognized text and never the raw audio.
      </p>
      <p>
        For full details, see our
        <NuxtLink to="/privacy">
          Privacy Policy
        </NuxtLink>.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Tech stack</h2>
      <p>
        WordTrail is a Progressive Web App built with:
      </p>
      <ul>
        <li>
          <a
            href="https://nuxt.com"
            target="_blank"
            rel="noopener noreferrer"
          >Nuxt 4</a>
          and
          <a
            href="https://ui.nuxt.com"
            target="_blank"
            rel="noopener noreferrer"
          >Nuxt UI 4</a>
        </li>
        <li>
          <a
            href="https://tailwindcss.com"
            target="_blank"
            rel="noopener noreferrer"
          >Tailwind CSS 4</a>
        </li>
        <li>
          <a
            href="https://vite-pwa-org.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >@vite-pwa/nuxt</a>
          for offline support and home-screen install
        </li>
        <li>
          <a
            href="https://ckeditor.com/ckeditor-5/"
            target="_blank"
            rel="noopener noreferrer"
          >CKEditor 5</a>
          for the rich-text script editor
        </li>
        <li>The Web Speech API for in-browser speech recognition</li>
        <li>The CSS Custom Highlight API for non-destructive word highlighting</li>
      </ul>
      <p>
        WordTrail is open source under the MIT license. The full source code and matching
        algorithm are available on
        <a
          href="https://github.com/kcfdaniel/word-trail"
          target="_blank"
          rel="noopener noreferrer"
        >GitHub</a>.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Browser support</h2>
      <p>
        Speech recognition through the Web Speech API works best in Chrome, Edge, and
        Safari. Firefox does not currently support the Web Speech API for recognition. For
        the most reliable microphone behavior on mobile, install WordTrail to your home
        screen as a PWA rather than running it in a browser tab.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Who built it</h2>
      <p>
        WordTrail is built and maintained by Daniel Kwok. If you want to suggest a feature,
        report a bug, or contribute, visit the
        <a
          href="https://github.com/kcfdaniel/word-trail"
          target="_blank"
          rel="noopener noreferrer"
        >GitHub repository</a>
        or email
        <a href="mailto:kcfdaniel@gmail.com">kcfdaniel@gmail.com</a>.
      </p>
    </section>
  </article>
</template>

<style scoped>
.content-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
  color: var(--text-primary);
}

.content-page-header {
  margin-bottom: 3rem;
}

.content-page-eyebrow {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin: 0 0 0.5rem;
}

.content-page-title {
  font-family: var(--font-script);
  font-size: clamp(2.25rem, 5.5vw, 3.25rem);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 1rem;
}

.content-page-title .accent {
  color: var(--accent);
  font-style: italic;
}

.content-page-lede {
  font-family: var(--font-script);
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--text-secondary);
  font-style: italic;
  margin: 0;
}

.content-page-section {
  margin-bottom: 2.25rem;
}

.content-page-section :deep(h2) {
  font-family: var(--font-script);
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

.content-page-section :deep(p),
.content-page-section :deep(li) {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.content-page-section :deep(p) {
  margin: 0 0 0.875rem;
}

.content-page-section :deep(p:last-child) {
  margin-bottom: 0;
}

.content-page-section :deep(ul) {
  margin: 0 0 0.875rem;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.content-page-section :deep(li) {
  margin: 0;
}

.content-page-section :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

.content-page-section :deep(em) {
  font-style: italic;
  font-family: var(--font-script);
  color: var(--text-primary);
}

.content-page-section :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.125rem 0.375rem;
  background: var(--surface-muted);
  border-radius: 0.25rem;
  color: var(--text-primary);
}

.content-page-section :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}

.content-page-section :deep(a:hover) {
  color: var(--accent-hover);
}

@media (max-width: 640px) {
  .content-page {
    padding: 2rem 1.25rem 3rem;
  }

  .content-page-header {
    margin-bottom: 2rem;
  }
}
</style>
