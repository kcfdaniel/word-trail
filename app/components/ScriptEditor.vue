<script setup lang="ts">
import type { Script } from '~/composables/useScriptManager'

const props = defineProps<{
  scripts: readonly Script[]
  currentScript: Script | null
}>()

const emit = defineEmits<{
  create: [title: string, content: string]
  select: [script: Script]
  update: [id: string, updates: { title?: string, content?: string }]
  delete: [id: string]
  close: []
}>()

const mode = ref<'list' | 'edit' | 'new'>('list')
const editingScript = ref<Script | null>(null)
const title = ref('')
const content = ref('')

const wordCount = computed(() => {
  return content.value.split(/\s+/).filter(w => w.trim().length > 0).length
})

const openNew = () => {
  mode.value = 'new'
  title.value = ''
  content.value = ''
  editingScript.value = null
}

const openEdit = (script: Script) => {
  mode.value = 'edit'
  editingScript.value = script
  title.value = script.title
  content.value = script.content
}

const save = () => {
  if (!content.value.trim()) return

  if (mode.value === 'new') {
    emit('create', title.value || 'Untitled Script', content.value)
  } else if (editingScript.value) {
    emit('update', editingScript.value.id, {
      title: title.value || 'Untitled Script',
      content: content.value
    })
  }

  mode.value = 'list'
}

const cancel = () => {
  mode.value = 'list'
  editingScript.value = null
  title.value = ''
  content.value = ''
}

const confirmDelete = (script: Script) => {
  if (confirm(`Delete "${script.title}"? This cannot be undone.`)) {
    emit('delete', script.id)
  }
}

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(timestamp))
}
</script>

<template>
  <div class="script-editor">
    <!-- Header -->
    <div class="editor-header">
      <h2 class="editor-title">
        {{ mode === 'list' ? 'Scripts' : mode === 'new' ? 'New Script' : 'Edit Script' }}
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

    <!-- List View -->
    <div
      v-if="mode === 'list'"
      class="editor-content"
    >
      <button
        class="new-script-button"
        @click="openNew"
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
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        New Script
      </button>

      <div
        v-if="scripts.length === 0"
        class="empty-scripts"
      >
        <p>No scripts yet. Create one to get started!</p>
      </div>

      <div
        v-else
        class="script-list"
      >
        <div
          v-for="script in scripts"
          :key="script.id"
          class="script-item"
          :class="{ 'script-item--active': currentScript?.id === script.id }"
          @click="emit('select', script); emit('close')"
        >
          <div class="script-item-content">
            <h3 class="script-item-title">
              {{ script.title }}
            </h3>
            <p class="script-item-preview">
              {{ script.content.slice(0, 100) }}{{ script.content.length > 100 ? '...' : '' }}
            </p>
            <span class="script-item-date">{{ formatDate(script.updatedAt) }}</span>
          </div>
          <div class="script-item-actions">
            <button
              class="action-button"
              title="Edit"
              @click.stop="openEdit(script)"
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
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
            <button
              class="action-button action-button--danger"
              title="Delete"
              @click.stop="confirmDelete(script)"
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/New View -->
    <div
      v-else
      class="editor-content editor-form"
    >
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
          {{ mode === 'new' ? 'Create Script' : 'Save Changes' }}
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

.new-script-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  border-radius: 0.75rem;
  font-family: var(--font-ui);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1.5rem;
}

.new-script-button:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.empty-scripts {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.script-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.script-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.script-item:hover {
  border-color: var(--border-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.script-item--active {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.script-item-content {
  flex: 1;
  min-width: 0;
}

.script-item-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 0.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.script-item-preview {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.script-item-date {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.script-item-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: var(--button-secondary-bg);
  color: var(--text-primary);
}

.action-button--danger:hover {
  background: var(--danger-subtle);
  color: var(--danger);
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
