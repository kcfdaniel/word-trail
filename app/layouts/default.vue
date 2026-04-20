<script setup lang="ts">
import { useStorage } from '@vueuse/core'

const { language, setLanguage } = useSpeech()

const languageStorage = useStorage('wordtrail-language', 'en-US', undefined, {
  listenToStorageChanges: true,
})

watch(languageStorage, (saved) => {
  if (saved) setLanguage(saved)
}, { immediate: true })

const handleLanguageSelect = (lang: string) => {
  setLanguage(lang)
  languageStorage.value = lang
}
</script>

<template>
  <div class="app-layout">
    <AppHeader>
      <NuxtLink
        to="/"
        class="app-layout-brand"
        aria-label="WordTrail home"
      >
        <img
          src="/app-logo.png"
          alt="WordTrail"
          class="app-layout-logo"
        >
      </NuxtLink>
      <template #right>
        <LanguageSelector
          :current-language="language"
          @select="handleLanguageSelect"
        />
      </template>
    </AppHeader>
    <main class="app-layout-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--surface);
}

.app-layout-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.app-layout-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.app-layout-main {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

@media (max-width: 640px) {
  .app-layout-logo {
    height: 28px;
  }
}
</style>
