<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer-inner">
      <div class="app-footer-brand">
        <img
          src="/app-logo.png"
          alt="WordTrail"
          class="app-footer-logo"
        >
        <p class="app-footer-tagline">
          {{ $t('footer.tagline') }}
        </p>
      </div>

      <nav
        class="app-footer-nav"
        :aria-label="$t('footer.navLabel')"
      >
        <div class="app-footer-nav-group">
          <h2 class="app-footer-heading">
            {{ $t('footer.product') }}
          </h2>
          <ul class="app-footer-list">
            <li>
              <NuxtLink
                to="/"
                class="app-footer-link"
              >
                {{ $t('footer.home') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/scripts"
                class="app-footer-link"
              >
                {{ $t('footer.scripts') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/about"
                class="app-footer-link"
              >
                {{ $t('footer.about') }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div class="app-footer-nav-group">
          <h2 class="app-footer-heading">
            {{ $t('footer.legal') }}
          </h2>
          <ul class="app-footer-list">
            <li>
              <NuxtLink
                to="/privacy"
                class="app-footer-link"
              >
                {{ $t('footer.privacy') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/terms"
                class="app-footer-link"
              >
                {{ $t('footer.terms') }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div class="app-footer-nav-group">
          <h2 class="app-footer-heading">
            {{ $t('footer.resources') }}
          </h2>
          <ul class="app-footer-list">
            <li>
              <a
                href="https://github.com/kcfdaniel/word-trail"
                class="app-footer-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ $t('footer.github') }}
              </a>
            </li>
            <li>
              <a
                href="mailto:kcfdaniel@gmail.com"
                class="app-footer-link"
              >
                {{ $t('footer.contact') }}
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>

    <div class="app-footer-bottom">
      <p class="app-footer-copy">
        © {{ year }} Daniel Kwok. {{ $t('footer.rights') }}
      </p>
      <p class="app-footer-meta">
        {{ $t('footer.builtWith') }}
      </p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: var(--surface-muted);
  border-top: 1px solid var(--border-subtle);
  padding: 2.5rem 1.5rem 1.5rem;
  position: relative;
  z-index: 1;
}

.app-footer-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2.5rem;
  padding-bottom: 2rem;
}

.app-footer-brand {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 320px;
}

.app-footer-logo {
  height: 28px;
  width: auto;
  object-fit: contain;
  align-self: flex-start;
}

.app-footer-tagline {
  font-family: var(--font-script);
  font-size: 0.95rem;
  font-style: italic;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.app-footer-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.app-footer-nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.app-footer-heading {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  margin: 0;
}

.app-footer-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.app-footer-link {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.app-footer-link:hover {
  color: var(--accent);
}

.app-footer-bottom {
  max-width: 1080px;
  margin: 0 auto;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.app-footer-copy,
.app-footer-meta {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin: 0;
}

@media (max-width: 768px) {
  .app-footer {
    padding: 2rem 1.25rem 1.25rem;
  }

  .app-footer-inner {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding-bottom: 1.5rem;
  }

  .app-footer-nav {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .app-footer-nav {
    grid-template-columns: repeat(2, 1fr);
  }

  .app-footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
