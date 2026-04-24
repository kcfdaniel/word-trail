<script setup lang="ts">
const { language } = useSpeech()
const { scripts, isLoaded } = useScriptManager()

// Hold the logo at '/' until useScriptManager has hydrated from localStorage;
// otherwise the prerendered '/' would mismatch a returning user's '/scripts'.
const logoLink = computed(() => {
  if (!isLoaded.value) return '/'
  return scripts.value.length > 0 ? '/scripts' : '/'
})
</script>

<template>
  <div class="app-layout">
    <AppHeader>
      <NuxtLink
        :to="logoLink"
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
          @select="language = $event"
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
