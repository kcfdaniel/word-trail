<script setup lang="ts">
const router = useRouter()

const {
  scripts,
  currentScript,
  isLoaded,
  createScript,
  setCurrentScript,
} = useScriptManager()

const autoStartListening = ref(false)

// Redirect to scripts list if user has scripts
watch([isLoaded, scripts], ([loaded, scriptsList]) => {
  if (loaded && scriptsList.length > 0 && !currentScript.value) {
    router.replace('/scripts')
  }
}, { immediate: true })

// Handle start reading from welcome landing
const handleStartReading = (scriptTitle: string, scriptContentHtml: string, _language: string) => {
  const newScript = createScript(scriptTitle, scriptContentHtml)
  setCurrentScript(newScript)
  autoStartListening.value = true
}

const closeReader = () => {
  setCurrentScript(null)
  autoStartListening.value = false
  // After closing reader, redirect to scripts list
  router.push('/scripts')
}
</script>

<template>
  <div class="landing-page">
    <!-- Loading State -->
    <Transition
      name="fade"
      mode="out-in"
    >
      <div
        v-if="!isLoaded"
        class="loading-state"
      >
        <div class="loader-content">
          <img
            src="/app-logo.png"
            alt="WordTrail"
            class="loader-logo"
          >
          <div class="loader-dots">
            <span class="loader-dot" />
            <span class="loader-dot" />
            <span class="loader-dot" />
          </div>
        </div>
      </div>

      <!-- Welcome Landing when no scripts -->
      <WelcomeLanding
        v-else-if="scripts.length === 0"
        @start-reading="handleStartReading"
      />
    </Transition>

    <!-- Script Reader Overlay -->
    <Transition name="slide-right">
      <ScriptReaderOverlay
        v-if="currentScript"
        :auto-start="autoStartListening"
        @close="closeReader"
      />
    </Transition>
  </div>
</template>

<style scoped>
/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide right transition for reader overlay */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

.landing-page {
  min-height: 100dvh;
  background: var(--surface);
}

/* Loading state */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  background: var(--surface);
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.loader-logo {
  height: 48px;
  width: auto;
  opacity: 0.9;
}

.loader-dots {
  display: flex;
  gap: 0.5rem;
}

.loader-dot {
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  animation: loader-wave 1.4s ease-in-out infinite;
  box-shadow: 0 0 12px var(--accent-shadow);
}

.loader-dot:nth-child(1) {
  animation-delay: 0s;
}

.loader-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.loader-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes loader-wave {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-12px);
    opacity: 1;
  }
}
</style>
