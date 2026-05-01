<script setup lang="ts">
const { language } = useSpeech()
</script>

<template>
  <div class="content-layout">
    <AppHeader>
      <NuxtLink
        to="/"
        class="content-layout-brand"
        aria-label="WordTrail home"
      >
        <img
          src="/app-logo.png"
          alt="WordTrail"
          class="content-layout-logo"
        >
      </NuxtLink>
      <template #right>
        <LanguageSelector
          :current-language="language"
          @select="language = $event"
        />
      </template>
    </AppHeader>
    <main class="content-layout-main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.content-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--surface);
}

.content-layout-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.content-layout-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.content-layout-main {
  flex: 1;
  position: relative;
  z-index: 1;
}

@media (max-width: 640px) {
  .content-layout-logo {
    height: 28px;
  }
}
</style>
