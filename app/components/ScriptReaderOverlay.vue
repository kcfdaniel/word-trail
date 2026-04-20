<script setup lang="ts">
import type { MatchResult } from '~/composables/useSpeechMatch'
import { useStorage } from '@vueuse/core'

const props = defineProps<{
  autoStart?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const {
  isListening,
  isSupported,
  transcript,
  interimTranscript,
  error,
  language,
  toggle: toggleSpeech,
  reset: resetSpeech,
  setLanguage,
} = useSpeech()

// Persist language selection reactively across views and reloads.
const languageStorage = useStorage('wordtrail-language', 'en-US', undefined, {
  listenToStorageChanges: true,
})

watch(languageStorage, (savedLanguage) => {
  if (savedLanguage) {
    setLanguage(savedLanguage)
  }
}, { immediate: true })

const handleLanguageSelect = (lang: string) => {
  setLanguage(lang)
  languageStorage.value = lang
  if (isListening.value) {
    resetSpeech()
    toggleSpeech()
  }
}

const { currentScript } = useScriptManager()

const {
  wordPositions,
  currentIndex,
  progress,
  handleMatch,
  setPositionAt,
  resetProgress,
  getNormalizedWords,
  clearAllHighlights,
} = useRichTextHighlight()

onMounted(() => {
  // Auto-start listening if autoStart prop is true
  if (props.autoStart && isSupported.value) {
    setTimeout(() => {
      if (!isListening.value) {
        toggleSpeech()
      }
    }, 300)
  }
})

const { createMatcher, splitWords } = useSpeechMatch()
const { isDebugEnabled, showDebugPanel, toggleDebugPanel } = useDebugMode()

const matcher = computed(() => {
  const words = getNormalizedWords.value.map(w => ({
    id: w.id,
    text: w.text,
  }))
  return createMatcher(words)
})

const showEditor = ref(false)
const lastMatch = ref<MatchResult | null>(null)

// Combine final transcript + interim for full spoken words
const allSpokenWords = computed(() => {
  const finalWords = splitWords(transcript.value)
  const interimWords = interimTranscript.value.trim()
    ? splitWords(interimTranscript.value)
    : []
  return [...finalWords, ...interimWords]
})

// Watch for any transcript changes (interim or final)
watch([transcript, interimTranscript], () => {
  if (wordPositions.value.length === 0 || allSpokenWords.value.length === 0) return

  const match = matcher.value.findBestMatch(allSpokenWords.value, currentIndex.value)
  if (match) {
    lastMatch.value = match
    handleMatch(match.index)
  }
})

const handleToggleListening = () => {
  if (!isSupported.value) return
  toggleSpeech()
}

const handleReset = () => {
  resetProgress()
  resetSpeech()
}

const handleEdit = () => {
  showEditor.value = true
}

const handleCloseEditor = () => {
  showEditor.value = false
}

const handleWordClick = (wordId: number) => {
  setPositionAt(wordId)
  resetSpeech()
  // Auto-start listening after clicking on a word to navigate
  if (isSupported.value) {
    setTimeout(() => {
      if (!isListening.value) {
        toggleSpeech()
      }
    }, 100)
  }
}

const goBack = () => {
  if (isListening.value) {
    toggleSpeech()
  }
  clearAllHighlights()
  emit('close')
}

onUnmounted(() => {
  clearAllHighlights()
})
</script>

<template>
  <div
    class="reader-overlay"
    :class="{ 'reader-overlay--debug': showDebugPanel }"
  >
    <!-- Header -->
    <AppHeader>
      <button
        class="back-button"
        :title="$t('reader.backToScripts')"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <span class="current-script-name">
        {{ currentScript?.title }}
      </span>

      <template #right>
        <LanguageSelector
          :current-language="language"
          @select="handleLanguageSelect"
        />

        <button
          v-if="isDebugEnabled"
          class="header-button"
          :class="{ 'header-button--debug': showDebugPanel }"
          :title="$t('reader.toggleDebug')"
          @click="toggleDebugPanel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m8 2 1.88 1.88" />
            <path d="M14.12 3.88 16 2" />
            <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
            <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
            <path d="M12 20v-9" />
            <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
            <path d="M6 13H2" />
            <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
            <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
            <path d="M22 13h-4" />
            <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
          </svg>
        </button>
      </template>
    </AppHeader>

    <!-- Main Content Area -->
    <div class="app-content">
      <main class="app-main">
        <RichTextTeleprompter
          :html-content="currentScript?.contentHtml ?? ''"
          :progress="progress"
          :is-listening="isListening"
          :show-debug="showDebugPanel"
          @toggle-listening="handleToggleListening"
          @reset="handleReset"
          @edit="handleEdit"
          @word-click="handleWordClick"
        />

        <Transition name="fade">
          <div
            v-if="error"
            class="error-banner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="12"
                x2="12"
                y1="8"
                y2="12"
              />
              <line
                x1="12"
                x2="12.01"
                y1="16"
                y2="16"
              />
            </svg>
            {{ error }}
          </div>
        </Transition>
      </main>

      <Transition name="debug-slide">
        <aside
          v-if="showDebugPanel"
          class="debug-sidebar"
        >
          <DebugPanel
            :transcript="transcript"
            :interim-transcript="interimTranscript"
            :is-listening="isListening"
            :current-index="currentIndex"
            :last-match="lastMatch"
            :words-count="wordPositions.length"
            :progress="progress"
            :sequence-length="allSpokenWords.length"
          />
        </aside>
      </Transition>
    </div>

    <!-- Script Editor Overlay -->
    <Transition name="slide-up">
      <div
        v-if="showEditor"
        class="editor-overlay"
      >
        <ScriptEditor
          @close="handleCloseEditor"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reader-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--surface);
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: var(--button-secondary-bg);
  color: var(--text-primary);
}

.current-script-name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 200px;
}

.header-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-button:hover {
  background: var(--button-secondary-bg);
  color: var(--text-primary);
}

.header-button--debug {
  background: #238636;
  color: #fff;
}

.header-button--debug:hover {
  background: #2ea043;
}

.app-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.app-main {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.debug-sidebar {
  width: 380px;
  flex-shrink: 0;
  overflow: hidden;
}

.error-banner {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  background: var(--danger-subtle);
  border: 1px solid var(--danger);
  border-radius: 0.5rem;
  color: var(--danger);
  font-size: 0.875rem;
}

.editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--surface);
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.debug-slide-enter-active,
.debug-slide-leave-active {
  transition: all 0.3s ease;
}

.debug-slide-enter-from,
.debug-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .debug-sidebar {
    width: 320px;
  }
}

@media (max-width: 640px) {
  .debug-sidebar {
    position: fixed;
    inset: 0;
    top: auto;
    width: 100%;
    height: 50%;
    z-index: 50;
    border-top: 1px solid #30363d;
  }
}
</style>
