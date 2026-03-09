<script setup lang="ts">
import type { Script } from '~/composables/useScriptManager'
import type { MatchResult } from '~/composables/useFuzzyMatch'

const props = defineProps<{
  script: Script
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
  setLanguage
} = useSpeech()

// Persist language selection to localStorage
const LANGUAGE_STORAGE_KEY = 'wordtrail-language'

onMounted(() => {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (savedLanguage) {
    setLanguage(savedLanguage)
  }
})

const handleLanguageSelect = (lang: string) => {
  setLanguage(lang)
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  if (isListening.value) {
    resetSpeech()
    toggleSpeech()
  }
}

const {
  scriptWords,
  currentIndex,
  getProgress,
  activeWordIndex,
  setCurrentScript,
  updateScript,
  handleMatch: handleMatchLegacy,
  setPositionAt: setPositionAtLegacy,
  resetProgress: resetProgressLegacy
} = useScriptManager()

// Rich text highlight system
const {
  wordPositions: richTextWordPositions,
  currentIndex: richTextCurrentIndex,
  progress: richTextProgress,
  handleMatch: handleMatchRichText,
  setPositionAt: setPositionAtRichText,
  resetProgress: resetProgressRichText,
  initializeWordIndex,
  getNormalizedWords,
  clearAllHighlights
} = useRichTextHighlight()

// Check if script uses rich text
const isRichTextMode = computed(() => {
  return Boolean(props.script.isRichText && props.script.contentHtml)
})

// Get HTML content for rich text teleprompter
const htmlContent = computed(() => {
  if (props.script.contentHtml) {
    return props.script.contentHtml
  }
  // Fallback: convert plain text to HTML
  return props.script.content
    .split('\n\n')
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
})

// Reference to the teleprompter component
const richTextTeleprompterRef = ref<{
  setPositionAt: (index: number) => void
  resetProgress: () => void
  wordPositions: { index: number; text: string; normalizedText: string }[]
  currentIndex: number
} | null>(null)

// Set the script when component mounts (for legacy mode)
onMounted(() => {
  if (!isRichTextMode.value) {
    setCurrentScript(props.script)
  }

  // Auto-start listening if autoStart prop is true
  if (props.autoStart && isSupported.value) {
    setTimeout(() => {
      if (!isListening.value) {
        toggleSpeech()
      }
    }, 300)
  }
})

// Update if script prop changes
watch(() => props.script, (newScript) => {
  if (!isRichTextMode.value) {
    setCurrentScript(newScript)
  }
})

const { createMatcher, splitWords } = useFuzzyMatch()
const { isDebugEnabled, showDebugPanel, toggleDebugPanel } = useDebugMode()

// Create optimized matcher based on mode
const matcher = computed(() => {
  if (isRichTextMode.value && getNormalizedWords.value.length > 0) {
    // Create words array compatible with useFuzzyMatch
    const words = getNormalizedWords.value.map(w => ({
      id: w.id,
      text: w.text,
      state: 'pending' as const
    }))
    return createMatcher(words)
  }
  return createMatcher(scriptWords.value)
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

// Current index for progress tracking (mode-aware)
const currentProgressIndex = computed(() => {
  return isRichTextMode.value ? richTextCurrentIndex.value : currentIndex.value
})

// Progress percentage (mode-aware)
const progressPercentage = computed(() => {
  return isRichTextMode.value ? richTextProgress.value : getProgress.value
})

// Word count for debug panel
const totalWordCount = computed(() => {
  return isRichTextMode.value ? richTextWordPositions.value.length : scriptWords.value.length
})

// Watch for any transcript changes (interim or final)
watch([transcript, interimTranscript], () => {
  const words = isRichTextMode.value
    ? getNormalizedWords.value
    : scriptWords.value

  if (words.length === 0) return

  const spokenWords = allSpokenWords.value
  if (spokenWords.length === 0) return

  const currentIdx = isRichTextMode.value
    ? richTextCurrentIndex.value
    : currentIndex.value

  // Use pre-computed matcher for O(1) lookups
  const match = matcher.value.findBestMatch(
    spokenWords,
    currentIdx
  )

  if (match) {
    lastMatch.value = match
    if (isRichTextMode.value) {
      handleMatchRichText(match.index)
    } else {
      handleMatchLegacy(match.index)
    }
  }
})

const handleToggleListening = () => {
  if (!isSupported.value) {
    alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
    return
  }
  toggleSpeech()
}

const handleReset = () => {
  if (isRichTextMode.value) {
    resetProgressRichText()
  } else {
    resetProgressLegacy()
  }
  resetSpeech()
}

const handleEdit = () => {
  showEditor.value = true
}

const handleCloseEditor = () => {
  showEditor.value = false
}

const handleWordClick = (wordId: number) => {
  if (isRichTextMode.value) {
    setPositionAtRichText(wordId)
  } else {
    setPositionAtLegacy(wordId)
  }
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

const handleUpdateScript = (id: string, updates: { title?: string, content?: string, contentHtml?: string, isRichText?: boolean }) => {
  updateScript(id, updates)
}

// Handle initialization of rich text word index
const handleRichTextInitialized = (wordCount: number) => {
  console.log(`Rich text initialized with ${wordCount} words`)
}

const goBack = () => {
  // Stop listening when closing
  if (isListening.value) {
    toggleSpeech()
  }
  // Clear highlights
  if (isRichTextMode.value) {
    clearAllHighlights()
  }
  emit('close')
}

// Clean up on unmount
onUnmounted(() => {
  if (isRichTextMode.value) {
    clearAllHighlights()
  }
})
</script>

<template>
  <div
    class="reader-overlay"
    :class="{ 'reader-overlay--debug': showDebugPanel }"
  >
    <!-- Header -->
    <header class="app-header">
      <div class="header-left">
        <button
          class="back-button"
          title="Back to scripts"
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
          {{ script.title }}
        </span>
        <span v-if="isRichTextMode" class="rich-text-badge">
          Rich Text
        </span>
      </div>

      <div class="header-right">
        <LanguageSelector
          :current-language="language"
          @select="handleLanguageSelect"
        />

        <button
          v-if="isDebugEnabled"
          class="header-button"
          :class="{ 'header-button--debug': showDebugPanel }"
          title="Toggle debug panel"
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
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="app-content">
      <main class="app-main">
        <!-- Rich Text Mode -->
        <RichTextTeleprompter
          v-if="isRichTextMode"
          ref="richTextTeleprompterRef"
          :html-content="htmlContent"
          :progress="progressPercentage"
          :is-listening="isListening"
          :show-debug="showDebugPanel"
          @toggle-listening="handleToggleListening"
          @reset="handleReset"
          @edit="handleEdit"
          @word-click="handleWordClick"
          @initialized="handleRichTextInitialized"
        />

        <!-- Legacy Plain Text Mode -->
        <ScriptReader
          v-else
          :words="scriptWords"
          :active-index="activeWordIndex"
          :progress="progressPercentage"
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
            :current-index="currentProgressIndex"
            :last-match="lastMatch"
            :words-count="totalWordCount"
            :progress="progressPercentage"
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
          :current-script="script"
          @update="handleUpdateScript"
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

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  max-width: 200px;
}

.rich-text-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: var(--accent-subtle);
  color: var(--accent);
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.header-right {
  display: flex;
  gap: 0.5rem;
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
  .app-header {
    padding: 0.625rem 1rem;
  }

  .current-script-name {
    display: none;
  }

  .rich-text-badge {
    display: none;
  }

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
