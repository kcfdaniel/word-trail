<script setup lang="ts">
definePageMeta({
  layout: 'content',
})

const title = 'Privacy Policy — WordTrail'
const description = 'How WordTrail handles your microphone audio, scripts, and analytics data. Plain English, no surprises.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: 'https://wordtrail.web.dev/privacy',
})

const lastUpdated = 'May 1, 2026'
</script>

<template>
  <article class="content-page">
    <header class="content-page-header">
      <p class="content-page-eyebrow">
        Legal
      </p>
      <h1 class="content-page-title">
        Privacy Policy
      </h1>
      <p class="content-page-meta">
        Last updated {{ lastUpdated }}
      </p>
    </header>

    <section class="content-page-section">
      <h2>Summary</h2>
      <p>
        WordTrail is a script-reading tool that listens to your microphone in your browser
        and highlights words on screen as you say them. We do not run a server that stores
        your scripts or your audio. Your scripts live in your browser's <code>localStorage</code>;
        speech recognition runs through your browser's built-in Web Speech API, which is
        provided by your browser vendor (typically Google for Chrome, Apple for Safari, or
        Microsoft for Edge).
      </p>
      <p>
        We display ads through Google AdSense, which uses cookies. Those are the only
        third-party cookies on this site. The rest of this page explains exactly what each
        feature does and what data leaves your device.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Microphone audio</h2>
      <p>
        When you click <strong>Start listening</strong>, your browser asks for permission
        to access the microphone. If you grant it, the browser captures audio and sends it
        to its built-in speech recognition service. WordTrail receives only the recognized
        text — never the raw audio — and uses that text to find your position in the script.
      </p>
      <p>
        Important details:
      </p>
      <ul>
        <li>
          The audio stream is processed by your browser vendor (Google, Apple, Microsoft, etc.),
          not by WordTrail. Their privacy policies apply to how they handle that audio.
        </li>
        <li>
          WordTrail does not record, store, or transmit your audio anywhere.
        </li>
        <li>
          The recognized text is held in memory only while you're reading. It is discarded
          when you stop the session or close the tab.
        </li>
        <li>
          You can revoke microphone permission at any time through your browser's site settings.
        </li>
      </ul>
    </section>

    <section class="content-page-section">
      <h2>Your scripts</h2>
      <p>
        Scripts you create or paste into WordTrail are saved to <code>localStorage</code> in
        your browser. <code>localStorage</code> is a per-site storage area that lives on your
        device — it is not transmitted to us or anyone else. The data stays there until you
        delete it, clear your browser data, or uninstall the app.
      </p>
      <p>
        Because storage is per-browser and per-device, scripts are not synced between devices
        and are not backed up. If you clear your browser data or switch devices, your scripts
        will not follow you. Treat WordTrail like a notepad on the device you're using.
      </p>
    </section>

    <section class="content-page-section">
      <h2>What we do not collect</h2>
      <ul>
        <li>We do not require an account or sign-in.</li>
        <li>We do not collect names, email addresses, or other contact details.</li>
        <li>We do not store your scripts on a server.</li>
        <li>We do not record or transmit microphone audio.</li>
        <li>We do not run server-side analytics that profile individual users.</li>
      </ul>
    </section>

    <section class="content-page-section">
      <h2>Advertising and cookies</h2>
      <p>
        WordTrail displays ads through Google AdSense. Google uses cookies and similar
        technologies to serve ads based on a user's prior visits to this site or other
        sites on the internet. These cookies allow Google and its partners to show
        personalized ads.
      </p>
      <p>
        You can opt out of personalized advertising by visiting
        <a
          href="https://www.google.com/settings/ads"
          target="_blank"
          rel="noopener noreferrer"
        >Google Ads Settings</a>.
        You may also visit
        <a
          href="https://www.aboutads.info"
          target="_blank"
          rel="noopener noreferrer"
        >www.aboutads.info</a>
        to opt out of a third-party vendor's use of cookies for personalized advertising.
      </p>
      <p>
        Google's use of advertising cookies enables it and its partners to serve ads to
        users based on their visit to this site and other sites on the internet. For more
        information about how Google uses data when you use partner sites or apps, see
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
        >Google's policy</a>.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Cookies set by WordTrail itself</h2>
      <p>
        WordTrail does not set its own tracking cookies. The only first-party storage we use
        is <code>localStorage</code> for your scripts and your selected interface language —
        described above.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Third-party services</h2>
      <p>
        WordTrail loads a small number of third-party resources to function:
      </p>
      <ul>
        <li>
          <strong>Google Fonts</strong> — to load the typefaces used on the page. Google
          may log requests for these font files.
        </li>
        <li>
          <strong>Google AdSense</strong> — to serve ads, as described above.
        </li>
        <li>
          <strong>Browser speech recognition</strong> — provided by your browser vendor;
          subject to their privacy policy.
        </li>
      </ul>
    </section>

    <section class="content-page-section">
      <h2>Children</h2>
      <p>
        WordTrail is not directed at children under 13, and we do not knowingly collect
        information from them. Because we do not collect personal information from anyone,
        this is automatic.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy when the site changes — for example, if we add
        new features that affect data handling. The "Last updated" date at the top of this
        page reflects the most recent revision. Please review this page periodically.
      </p>
    </section>

    <section class="content-page-section">
      <h2>Contact</h2>
      <p>
        Questions or concerns about this Privacy Policy can be sent to
        <a href="mailto:kcfdaniel@gmail.com">kcfdaniel@gmail.com</a>.
        WordTrail is operated by Daniel Kwok.
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
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

.content-page-meta {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  margin: 0;
  font-family: var(--font-mono);
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
