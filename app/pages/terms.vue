<script setup lang="ts">
definePageMeta({
  layout: 'content',
})

const title = 'Terms of Service — WordTrail'
const description = 'The terms that govern your use of WordTrail. Plain English summary at the top.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: 'https://wordtrail.web.dev/terms',
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
        Terms of Service
      </h1>
      <p class="content-page-meta">
        Last updated {{ lastUpdated }}
      </p>
    </header>

    <section class="content-page-section">
      <h2>The short version</h2>
      <p>
        WordTrail is a free script-reading tool. You can use it for personal or professional
        work. Your scripts stay in your browser. The software is provided "as is" — it might
        have bugs, speech recognition might mishear you, and we cannot guarantee uptime or
        accuracy. Be sensible: don't use it for anything where a missed word could cause
        real harm without independent verification.
      </p>
      <p>
        The full terms below spell out the legal version of the same thing.
      </p>
    </section>

    <section class="content-page-section">
      <h2>1. Acceptance of these terms</h2>
      <p>
        By using WordTrail (the "Service"), you agree to these Terms of Service ("Terms").
        If you do not agree, please do not use the Service. The Service is operated by
        Daniel Kwok ("we", "us", "our").
      </p>
    </section>

    <section class="content-page-section">
      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to use WordTrail. If you are between 13 and the
        age of legal majority in your jurisdiction, you may use the Service only with the
        consent of a parent or legal guardian.
      </p>
    </section>

    <section class="content-page-section">
      <h2>3. Your use of the Service</h2>
      <p>
        You may use WordTrail for any lawful purpose, personal or commercial. You agree
        not to:
      </p>
      <ul>
        <li>Use the Service to violate any law or the rights of others.</li>
        <li>
          Attempt to interfere with or disrupt the Service, including by overloading it,
          sending malicious traffic, or attempting to access systems or data you are not
          authorized to access.
        </li>
        <li>
          Use automated tools (scrapers, bots, headless browsers running at scale) to
          generate excessive load.
        </li>
        <li>
          Reverse-engineer, decompile, or attempt to extract the source code of the Service
          beyond what is permitted by applicable open-source licenses on its components.
        </li>
        <li>
          Remove or obscure any notices, including this one, displayed by the Service.
        </li>
      </ul>
    </section>

    <section class="content-page-section">
      <h2>4. Your content</h2>
      <p>
        WordTrail does not host or store your scripts. Scripts you create or paste into the
        Service are kept in your browser's local storage on your device. You retain all
        ownership and rights to your scripts and to your speech.
      </p>
      <p>
        Because we do not store your content, we cannot recover scripts that are lost when
        you clear browser data, change devices, or uninstall the Service. You are responsible
        for keeping your own backups of any scripts that matter to you.
      </p>
    </section>

    <section class="content-page-section">
      <h2>5. Speech recognition accuracy</h2>
      <p>
        WordTrail uses your browser's built-in Web Speech API for recognition. Accuracy
        depends on the browser, the language model your browser provides, your microphone,
        ambient noise, accent, speech patterns, and many other factors outside our control.
        WordTrail's matching layer is designed to be tolerant of recognition errors, but it
        is not perfect.
      </p>
      <p>
        Do not rely on WordTrail for any task where a missed or misread word could cause
        material harm — including but not limited to medical, legal, safety-critical, or
        broadcast contexts — without independent verification.
      </p>
    </section>

    <section class="content-page-section">
      <h2>6. Service availability</h2>
      <p>
        WordTrail is offered free of charge. We do not guarantee that the Service will be
        available without interruption, free of bugs, or compatible with every browser and
        device. We may modify, suspend, or discontinue the Service, in whole or in part,
        at any time without notice.
      </p>
    </section>

    <section class="content-page-section">
      <h2>7. Third-party services</h2>
      <p>
        The Service relies on third-party providers — your browser vendor's speech
        recognition service, Google Fonts, and Google AdSense — described in our
        <NuxtLink to="/privacy">
          Privacy Policy
        </NuxtLink>.
        Use of those services is subject to the terms and privacy policies of the relevant
        third party. We are not responsible for the availability or behavior of third-party
        services.
      </p>
    </section>

    <section class="content-page-section">
      <h2>8. Intellectual property</h2>
      <p>
        The WordTrail name, logo, design, and original code are the property of Daniel Kwok,
        unless otherwise noted. Source components published under open-source licenses
        (such as Nuxt, Vue, and CKEditor) are governed by their respective licenses. Nothing
        in these Terms grants you a license to our trademarks.
      </p>
    </section>

    <section class="content-page-section">
      <h2>9. Disclaimer of warranties</h2>
      <p>
        THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES
        OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION THE IMPLIED
        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
        ERROR-FREE, OR FREE OF HARMFUL COMPONENTS, OR THAT SPEECH RECOGNITION RESULTS
        WILL BE ACCURATE.
      </p>
    </section>

    <section class="content-page-section">
      <h2>10. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL WE BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
        LOSS OF DATA, PROFITS, OR REVENUE, WHETHER ARISING UNDER CONTRACT, TORT, OR ANY
        OTHER LEGAL THEORY, AND WHETHER OR NOT WE WERE ADVISED OF THE POSSIBILITY OF SUCH
        DAMAGES, RESULTING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
      </p>
      <p>
        Some jurisdictions do not allow the exclusion of certain warranties or limitations
        of liability, so some of the above may not apply to you.
      </p>
    </section>

    <section class="content-page-section">
      <h2>11. Changes to these Terms</h2>
      <p>
        We may revise these Terms from time to time. The "Last updated" date at the top of
        this page reflects the most recent revision. Continued use of the Service after a
        change constitutes acceptance of the revised Terms. If we make a material change,
        we will try to provide reasonable notice through the Service.
      </p>
    </section>

    <section class="content-page-section">
      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which the operator
        ordinarily resides, without regard to its conflict-of-laws principles. Any dispute
        arising from these Terms or the Service will be resolved in the courts of that
        jurisdiction, except where applicable law requires otherwise.
      </p>
    </section>

    <section class="content-page-section">
      <h2>13. Contact</h2>
      <p>
        For questions about these Terms, contact
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
