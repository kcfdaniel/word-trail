<script setup lang="ts">
import type { Script } from '~/composables/useScriptManager'

const props = defineProps<{
  currentScript: Script | null
}>()

const emit = defineEmits<{
  update: [id: string, updates: { title?: string, content?: string }]
  close: []
}>()

const title = ref('')
const content = ref('')

const wordCount = computed(() => {
  return content.value.split(/\s+/).filter(w => w.trim().length > 0).length
})

// Initialize with current script data
onMounted(() => {
  if (props.currentScript) {
    title.value = props.currentScript.title
    content.value = props.currentScript.content
  }
})

const save = () => {
  if (!content.value.trim() || !props.currentScript) return

  emit('update', props.currentScript.id, {
    title: title.value || 'Untitled Script',
    content: content.value
  })
  emit('close')
}

const cancel = () => {
  emit('close')
}
</script>

<template>
  <div class="script-editor">
    <!-- Header -->
    <div class="editor-header">
      <h2 class="editor-title">
        Edit Script
      </h2>
      <button
        class="close-button"
        aria-label="Close"
        @click="emit('close')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>

    <!-- Edit Form -->
    <div class="editor-content editor-form">
      <div class="form-group">
        <label
          for="script-title"
          class="form-label"
        >Title</label>
        <input
          id="script-title"
          v-model="title"
          type="text"
          class="form-input"
          placeholder="Enter script title..."
        >
      </div>

      <div class="form-group form-group--grow">
        <label
          for="script-content"
          class="form-label"
        >
          Script Content
          <span class="word-count">{{ wordCount }} words</span>
        </label>
        <textarea
          id="script-content"
          v-model="content"
          class="form-textarea"
          placeholder="Paste or type your script here..."
        />
      </div>

      <div class="form-actions">
        <button
          class="form-button form-button--secondary"
          @click="cancel"
        >
          Cancel
        </button>
        <button
          class="form-button form-button--primary"
          :disabled="!content.trim()"
          @click="save"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.script-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-elevated);
}

.editor-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-button {
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

.close-button:hover {
  background: var(--button-secondary-bg);
  color: var(--text-primary);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Form Styles */
.editor-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group--grow {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.word-count {
  font-weight: 400;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  font-family: var(--font-ui);
  font-size: 0.9375rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.form-textarea {
  flex: 1;
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  font-family: var(--font-script);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  resize: none;
  transition: all 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
  margin-top: auto;
}

.form-button {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-family: var(--font-ui);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-button--secondary {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-text);
}

.form-button--secondary:hover {
  background: var(--button-secondary-hover);
}

.form-button--primary {
  background: var(--accent);
  color: var(--accent-text);
}

.form-button--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.form-button--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
