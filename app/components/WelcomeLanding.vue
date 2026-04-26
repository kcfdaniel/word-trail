<script setup lang="ts">
import { htmlToPlainText } from '~/utils/richText'

const emit = defineEmits<{
  'start-reading': [title: string, contentHtml: string]
}>()

const { t } = useI18n()
const { isSupported } = useSpeech()

const editedTitle = ref('')
const hasEditedTitle = ref(false)
const contentHtml = ref('')

const title = computed({
  get: () => {
    return hasEditedTitle.value ? editedTitle.value : t('welcome.firstScriptTitle')
  },
  set: (value: string) => {
    hasEditedTitle.value = true
    editedTitle.value = value
  },
})

const plainContent = computed(() => htmlToPlainText(contentHtml.value))

const wordCount = computed(() => {
  return plainContent.value.split(/\s+/).filter(w => w.trim().length > 0).length
})

const canStart = computed(() => plainContent.value.trim().length > 0)

// Platform detection for keyboard hint
const isMac = computed(() => {
  if (import.meta.client) {
    return navigator.platform?.includes('Mac')
  }
  return false
})

const handleStart = () => {
  if (!canStart.value) return
  emit('start-reading', title.value || t('common.untitledScript'), contentHtml.value)
}

// Cmd/Ctrl+Enter anywhere inside the card submits, including from the
// CKEditor surface — we listen on the wrapper so the event can bubble up.
const handleCardKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return
  if (!(event.metaKey || event.ctrlKey)) return
  event.preventDefault()
  handleStart()
}
</script>

<template>
  <div class="welcome-landing">
    <!-- Ambient background elements -->
    <div class="ambient-glow ambient-glow--1" />
    <div class="ambient-glow ambient-glow--2" />

    <!-- Main content -->
    <div class="landing-main">
      <div class="landing-content h-full">
        <!-- Hero section -->
        <div class="hero-section">
          <div class="hero-badge">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line
                x1="12"
                x2="12"
                y1="19"
                y2="22"
              />
            </svg>
            {{ $t('welcome.badge') }}
          </div>
          <h1 class="hero-title">
            {{ $t('welcome.titleStart') }}<br>
            <span class="hero-title-accent">{{ $t('welcome.titleAccent') }}</span>
          </h1>
        </div>

        <!-- Script input card -->
        <div class="script-card h-full">
          <div
            class="card-inner h-full overflow-scroll"
            @keydown="handleCardKeydown"
          >
            <!-- Title input -->
            <div class="input-group input-group--title">
              <label
                for="script-title"
                class="input-label"
              >{{ $t('welcome.titleLabel') }}</label>
              <input
                id="script-title"
                v-model="title"
                type="text"
                class="title-input"
                :placeholder="$t('welcome.titlePlaceholder')"
              >
            </div>

            <!-- Content editor -->
            <div class="input-group input-group--content h-full">
              <label
                for="script-content"
                class="input-label"
              >
                {{ $t('welcome.contentLabel') }}
                <span
                  v-if="wordCount > 0"
                  class="word-counter"
                >
                  {{ $t('welcome.wordCount', { count: wordCount }, wordCount) }}
                </span>
              </label>
              <div class="editor-wrapper h-full">
                <ClientOnly>
                  <RichTextEditor
                    v-model="contentHtml"
                    :placeholder="$t('welcome.contentPlaceholder')"
                  />
                  <template #fallback>
                    <div class="editor-loading">
                      <div class="editor-loading__spinner" />
                      <span>{{ $t('editor.loadingEditor') }}</span>
                    </div>
                  </template>
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>
        <!-- Start button -->
        <button
          class="start-button"
          :class="{ 'start-button--ready': canStart }"
          :disabled="!canStart"
          @click="handleStart"
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
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line
              x1="12"
              x2="12"
              y1="19"
              y2="22"
            />
          </svg>
          {{ $t('welcome.startButton') }}
        </button>

        <!-- Browser support warning -->
        <p
          v-if="!isSupported"
          class="browser-warning"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
          {{ $t('welcome.browserWarning') }}
        </p>

        <!-- Subtle hint -->
        <i18n-t
          tag="p"
          class="keyboard-hint"
          keypath="welcome.keyboardHint"
          scope="global"
        >
          <template #keys>
            <kbd>{{ isMac ? '⌘' : 'Ctrl' }}</kbd> + <kbd>Enter</kbd>
          </template>
        </i18n-t>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-landing {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  position: relative;
  overflow: hidden;
}

/* Ambient glows for warmth */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.ambient-glow--1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%);
  top: -200px;
  right: -100px;
}

.ambient-glow--2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(217, 119, 6, 0.1) 0%, transparent 70%);
  bottom: -150px;
  left: -100px;
}

/* Main content */
.landing-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  z-index: 1;
  height: 100%;
}

.landing-content {
  width: 100%;
  max-width: 1080px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Hero section */
.hero-section {
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.75rem;
  background: var(--accent-subtle);
  color: var(--accent);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 2rem;
  margin-bottom: 0.75rem;
}

.hero-badge svg {
  width: 12px;
  height: 12px;
}

.hero-title {
  font-family: var(--font-script);
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 500;
  line-height: 1.15;
  color: var(--text-primary);
  margin: 0 0 0.625rem;
  letter-spacing: -0.02em;
}

.hero-title-accent {
  color: var(--accent);
}

/* Script card */
.script-card {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 0.875rem;
  overflow: hidden;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 24px rgba(0, 0, 0, 0.06);
}

.card-inner {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Input groups */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.word-counter {
  font-weight: 400;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

.title-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.title-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.title-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}

:deep(.rich-text-editor) {
  height: 100%;
  position: relative;
  .ck-editor {
    height: 100%;
    display: flex;
    flex-direction: column;
    .ck-editor__main {
      height: 100%;
      .ck-content {
        height: 100%;
      }
    }
  }
}

.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 140px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.editor-loading__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Start button */
.start-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1.25rem;
  background: var(--button-secondary-bg);
  color: var(--text-tertiary);
  border: none;
  border-radius: 0.625rem;
  font-family: var(--font-ui);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: not-allowed;
  transition: all 0.25s ease;
}

.start-button svg {
  width: 18px;
  height: 18px;
}

.start-button--ready {
  background: var(--accent);
  color: var(--accent-text);
  cursor: pointer;
  box-shadow: 0 2px 12px var(--accent-shadow);
}

.start-button--ready:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px var(--accent-shadow);
}

.start-button--ready:active {
  transform: translateY(0);
}

/* Browser warning */
.browser-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background: rgba(234, 179, 8, 0.1);
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: #b45309;
  margin: 0;
}

.dark .browser-warning {
  background: rgba(234, 179, 8, 0.15);
  color: #fbbf24;
}

/* Keyboard hint */
.keyboard-hint {
  text-align: center;
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  margin: 0;
}

.keyboard-hint kbd {
  display: inline-block;
  padding: 0.1rem 0.3rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  box-shadow: 0 1px 0 var(--border-subtle);
}

/* Mobile adjustments */
@media (max-width: 640px) {
  .landing-main {
    padding: 1rem;
  }

  .landing-content {
    gap: 1rem;
  }

  .hero-title {
    font-size: 1.75rem;
  }

  .card-inner {
    padding: 1rem;
    gap: 0.875rem;
  }

  .keyboard-hint {
    display: none;
  }
}

/* Animation on mount */
.hero-section {
  animation: fadeInUp 0.6s ease-out;
}

.script-card {
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.keyboard-hint {
  animation: fadeIn 0.6s ease-out 0.3s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
