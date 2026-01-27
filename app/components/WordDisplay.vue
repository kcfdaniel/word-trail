<script setup lang="ts">
import type { ScriptWord } from '~/composables/useScriptManager'

const props = defineProps<{
  word: ScriptWord
  isActive: boolean
}>()

const emit = defineEmits<{
  click: [wordId: number]
}>()

const wordRef = ref<HTMLSpanElement | null>(null)

watch(() => props.isActive, (active) => {
  if (active && wordRef.value) {
    wordRef.value.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    })
  }
})

const stateClass = computed(() => {
  switch (props.word.state) {
    case 'completed':
      return 'word--completed'
    case 'active':
      return 'word--active'
    default:
      return 'word--pending'
  }
})

const handleClick = () => {
  emit('click', props.word.id)
}
</script>

<template>
  <span
    ref="wordRef"
    class="word"
    :class="stateClass"
    :data-word-id="word.id"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    {{ word.text }}
  </span>
</template>

<style scoped>
.word {
  display: inline;
  padding: 0.125rem 0.1rem;
  margin: 0 0.05rem;
  border-radius: 0.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.word:hover {
  background: var(--word-hover-bg, rgba(0, 0, 0, 0.05));
}

.word:active {
  transform: scale(0.98);
}

.word--pending {
  color: var(--word-pending);
  opacity: 0.85;
}

.word--pending:hover {
  opacity: 1;
}

.word--completed {
  color: var(--word-completed);
  opacity: 0.7;
}

.word--completed:hover {
  opacity: 0.9;
}

.word--active {
  color: var(--word-active-text);
  background: var(--word-active-bg);
  box-shadow:
    0 0 20px var(--word-active-glow),
    0 0 40px var(--word-active-glow-outer);
  font-weight: 500;
  transform: scale(1.02);
  animation: pulse-glow 2s ease-in-out infinite;
}

.word--active:hover {
  background: var(--word-active-bg);
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow:
      0 0 20px var(--word-active-glow),
      0 0 40px var(--word-active-glow-outer);
  }
  50% {
    box-shadow:
      0 0 25px var(--word-active-glow),
      0 0 50px var(--word-active-glow-outer);
  }
}
</style>
