<script setup lang="ts">
import type { ScriptWord } from '~/composables/useScriptManager'

defineProps<{
  words: ScriptWord[]
  activeIndex: number
  progress: number
  isListening: boolean
}>()

const emit = defineEmits<{
  'toggle-listening': []
  'reset': []
  'edit': []
  'word-click': [wordId: number]
}>()
</script>

<template>
  <div class="script-reader">
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

    <!-- Script Display -->
    <div class="script-container">
      <div class="script-text">
        <WordDisplay
          v-for="word in words"
          :key="word.id"
          :word="word"
          :is-active="word.id === activeIndex"
          @click="emit('word-click', $event)"
        />
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button
        class="control-button control-button--secondary"
        title="Reset progress"
        @click="emit('reset')"
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
        title="Edit script"
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
  </div>
</template>

<style scoped>
.script-reader {
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

.script-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 3rem 2rem;
  scroll-behavior: smooth;
  min-height: 0; /* Allow flex child to shrink */
}

.script-text {
  font-family: var(--font-script);
  font-size: 1.5rem;
  line-height: 2.2;
  text-align: center;
  max-width: 48rem;
  margin: 0 auto;
  word-spacing: 0.15em;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

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

@media (max-width: 640px) {
  .script-text {
    font-size: 1.25rem;
    line-height: 2;
    padding: 2rem 1rem;
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
