<script setup lang="ts">
/**
 * RichTextTeleprompter
 *
 * Renders rich text content in a read-only CKEditor surface with
 * word-by-word highlighting using the CSS Custom Highlight API.
 */

interface EditorInstance {
  ui?: { getEditableElement?: () => HTMLElement | undefined }
}

defineProps<{
  htmlContent: string
  progress: number
  isListening: boolean
  showDebug?: boolean
}>()

const emit = defineEmits<{
  'toggle-listening': []
  'reset': []
  'edit': []
  'word-click': [wordIndex: number]
}>()

const {
  wordPositions,
  currentIndex,
  isSupported,
  initializeWordIndex,
  getWordAtPoint,
  resetProgress,
} = useRichTextHighlight()

const scriptContainer = ref<HTMLElement | null>(null)

const handleEditorReady = async (editor: EditorInstance) => {
  await nextTick()
  const editable = editor.ui?.getEditableElement?.()
  if (!editable) return
  initializeWordIndex(editable, scriptContainer.value ?? editable)
}

const handleContentClick = (event: MouseEvent) => {
  const word = getWordAtPoint(event.clientX, event.clientY)
  if (word) emit('word-click', word.index)
}

const handleReset = () => {
  resetProgress()
  scriptContainer.value?.scrollTo({ top: 0, behavior: 'smooth' })
  emit('reset')
}
</script>

<template>
  <div class="rich-teleprompter">
    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <span class="progress-text">{{ progress }}%</span>
    </div>

    <!-- API Support Warning -->
    <div
      v-if="!isSupported"
      class="api-warning"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <span>{{ $t('reader.apiWarning') }}</span>
    </div>

    <!-- Script Display with Rich Text -->
    <div
      ref="scriptContainer"
      class="script-container"
      @click="handleContentClick"
    >
      <RichTextEditor
        :model-value="htmlContent"
        :read-only="true"
        :show-toolbar="false"
        :placeholder="' '"
        @ready="handleEditorReady"
      />
    </div>

    <!-- Controls -->
    <div class="controls">
      <button
        class="control-button control-button--secondary"
        :title="$t('reader.resetProgress')"
        @click="handleReset"
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
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      <button
        class="control-button control-button--primary"
        :class="{ 'control-button--listening': isListening }"
        @click="emit('toggle-listening')"
      >
        <svg
          v-if="!isListening"
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
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
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect
            width="6"
            height="6"
            x="9"
            y="9"
            rx="1"
          />
        </svg>
      </button>

      <button
        class="control-button control-button--secondary"
        :title="$t('reader.editScript')"
        @click="emit('edit')"
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
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    </div>

    <!-- Listening Indicator -->
    <div
      v-if="isListening"
      class="listening-indicator"
    >
      <span class="listening-dot" />
      <span class="listening-dot" />
      <span class="listening-dot" />
    </div>

    <!-- Debug Info -->
    <div
      v-if="showDebug"
      class="debug-info"
    >
      <div class="debug-stat">
        <span class="debug-label">Words:</span>
        <span class="debug-value">{{ wordPositions.length }}</span>
      </div>
      <div class="debug-stat">
        <span class="debug-label">Current:</span>
        <span class="debug-value">{{ currentIndex }}</span>
      </div>
      <div class="debug-stat">
        <span class="debug-label">API:</span>
        <span
          class="debug-value"
          :class="{ 'debug-value--success': isSupported, 'debug-value--error': !isSupported }"
        >
          {{ isSupported ? 'Supported' : 'Fallback' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rich-teleprompter {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border-subtle);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--progress-bg);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--progress-fill);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 3rem;
  text-align: right;
  font-family: var(--font-mono);
}

.api-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--accent-subtle);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--accent);
  font-size: 0.75rem;
}

.script-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 3rem 2rem;
  padding-top: 0;
  scroll-behavior: smooth;
  min-height: 0;
  cursor: pointer;
}

.script-container :deep(.rich-text-editor) {
  max-width: 48rem;
  margin: 0 auto;
}

.script-container :deep(.ck.ck-editor) {
  width: 100%;
}

.script-container :deep(.ck.ck-editor__top) {
  display: none;
}

.script-container :deep(.ck.ck-editor__main > .ck-editor__editable) {
  min-height: 100%;
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.script-container :deep(.ck.ck-editor__main > .ck-editor__editable.ck-focused) {
  box-shadow: none;
}

.script-container :deep(.ck-content) {
  font-family: var(--font-script);
  font-size: 1.5rem;
  line-height: 2.2;
  word-spacing: 0.15em;
  word-wrap: break-word;
  overflow-wrap: break-word;
  color: var(--word-pending);
}

.script-container :deep(.ck-content h1) {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 1.5rem 0 1rem;
  color: var(--text-primary);
}

.script-container :deep(.ck-content h2) {
  font-size: 2rem;
  font-weight: 600;
  margin: 1.25rem 0 0.875rem;
  color: var(--text-primary);
}

.script-container :deep(.ck-content h3) {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 1rem 0 0.75rem;
  color: var(--text-primary);
}

.script-container :deep(.ck-content p) {
  margin-bottom: 1rem;
}

.script-container :deep(.ck-content ul),
.script-container :deep(.ck-content ol) {
  padding-left: 2rem;
  margin-bottom: 1rem;
}

.script-container :deep(.ck-content li) {
  margin-bottom: 0.5rem;
}

.script-container :deep(.ck-content strong),
.script-container :deep(.ck-content b) {
  font-weight: 600;
}

.script-container :deep(.ck-content em),
.script-container :deep(.ck-content i) {
  font-style: italic;
}

.script-container :deep(.ck-content u) {
  text-decoration: underline;
}

.script-container :deep(.ck-content s),
.script-container :deep(.ck-content strike) {
  text-decoration: line-through;
}

/* Controls */
.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface-elevated);
  border-top: 1px solid var(--border-subtle);
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-button--secondary {
  width: 48px;
  height: 48px;
  background: var(--button-secondary-bg);
  color: var(--button-secondary-text);
}

.control-button--secondary:hover {
  background: var(--button-secondary-hover);
  transform: scale(1.05);
}

.control-button--primary {
  width: 72px;
  height: 72px;
  background: var(--accent);
  color: var(--accent-text);
  box-shadow: 0 4px 20px var(--accent-shadow);
}

.control-button--primary:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.control-button--listening {
  background: var(--danger);
  animation: pulse-recording 1.5s ease-in-out infinite;
}

@keyframes pulse-recording {
  0%, 100% {
    box-shadow: 0 4px 20px var(--danger-shadow);
  }
  50% {
    box-shadow: 0 4px 30px var(--danger-shadow), 0 0 0 8px var(--danger-ring);
  }
}

/* Listening Indicator */
.listening-indicator {
  position: absolute;
  bottom: 140px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  background: var(--surface-elevated);
  border-radius: 2rem;
  box-shadow: 0 2px 12px var(--shadow-color);
}

.listening-dot {
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.listening-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.listening-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Debug Info */
.debug-info {
  position: absolute;
  top: 4rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  z-index: 10;
}

.debug-stat {
  display: flex;
  gap: 0.5rem;
}

.debug-label {
  color: var(--text-tertiary);
}

.debug-value {
  color: var(--text-primary);
  font-weight: 500;
}

.debug-value--success {
  color: #22c55e;
}

.debug-value--error {
  color: var(--danger);
}

@media (max-width: 640px) {
  .script-container :deep(.ck-content) {
    font-size: 1.25rem;
    line-height: 2;
  }

  .controls {
    padding: 1rem;
  }

  .control-button--primary {
    width: 64px;
    height: 64px;
  }

  .control-button--secondary {
    width: 44px;
    height: 44px;
  }
}
</style>

<style>
/* CSS Custom Highlight API Styles - Must be global */

/* Active word highlight */
::highlight(wordtrail-active) {
  background-color: var(--word-active-bg);
  color: var(--word-active-text);
}

/* Completed words highlight */
::highlight(wordtrail-completed) {
  color: var(--word-completed);
}

/* Custom styling for the active word glow effect */
/* Note: box-shadow not supported in ::highlight, using background only */
</style>
