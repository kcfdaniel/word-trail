<script setup lang="ts">
import type { Script } from '~/composables/useScriptManager'

const router = useRouter()

const {
  scripts,
  currentScript,
  isLoaded,
  createScript,
  updateScript,
  deleteScript
} = useScriptManager()

// Redirect to landing page if no scripts
watch([isLoaded, scripts], ([loaded, scriptsList]) => {
  if (loaded && scriptsList.length === 0) {
    router.replace('/')
  }
}, { immediate: true })

const searchQuery = ref('')
const mode = ref<'list' | 'edit' | 'new'>('list')
const editingScript = ref<Script | null>(null)
const title = ref('')
const content = ref('')

// Script reader overlay state
const selectedScript = ref<Script | null>(null)

const wordCount = computed(() => {
  return content.value.split(/\s+/).filter(w => w.trim().length > 0).length
})

// Filter and sort scripts: search by title, sort by updatedAt descending
const filteredScripts = computed(() => {
  let result = [...scripts.value]

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(script =>
      script.title.toLowerCase().includes(query)
    )
  }

  // Sort by updatedAt descending (latest first)
  result.sort((a, b) => b.updatedAt - a.updatedAt)

  return result
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
    createScript(title.value || 'Untitled Script', content.value)
  } else if (editingScript.value) {
    updateScript(editingScript.value.id, {
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
    deleteScript(script.id)
  }
}

const selectAndNavigate = (script: Script) => {
  selectedScript.value = script
}

const closeReader = () => {
  selectedScript.value = null
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
  <div class="scripts-page">
    <!-- Loading State -->
    <Transition name="fade" mode="out-in">
      <div v-if="!isLoaded" class="loading-state">
        <div class="loader-content">
          <img
            src="/app-logo.png"
            alt="WordTrail"
            class="loader-logo"
          />
          <div class="loader-dots">
            <span class="loader-dot" />
            <span class="loader-dot" />
            <span class="loader-dot" />
          </div>
        </div>
      </div>

      <div v-else class="page-loaded">
        <!-- Header -->
        <header class="page-header">
          <div class="header-left">
            <img
              src="/app-logo.png"
              alt="WordTrail"
              class="app-logo"
            />
          </div>
        </header>

        <!-- Page Title -->
        <div class="page-title-section">
          <h1 class="page-title">
            Scripts
          </h1>
        </div>

        <!-- List View -->
        <div class="page-content">
      <!-- Search and New Button -->
      <div class="toolbar">
        <div class="search-box">
          <svg
            class="search-icon"
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
              cx="11"
              cy="11"
              r="8"
            />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Search scripts..."
          >
        </div>
        <button
          class="new-button"
          @click="openNew"
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
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New
        </button>
      </div>

      <!-- Scripts List -->
      <div
        v-if="filteredScripts.length === 0 && searchQuery"
        class="empty-state"
      >
        <p>No scripts matching "{{ searchQuery }}"</p>
      </div>

      <div
        v-else
        class="script-list"
      >
        <div
          v-for="script in filteredScripts"
          :key="script.id"
          class="script-item"
          :class="{ 'script-item--active': currentScript?.id === script.id }"
          @click="selectAndNavigate(script)"
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
      </div>
    </Transition>

    <!-- Edit/New Overlay -->
    <Transition name="slide-up">
      <div
        v-if="mode !== 'list'"
        class="editor-overlay"
      >
        <div class="editor-header">
          <h2 class="editor-title">
            {{ mode === 'new' ? 'New Script' : 'Edit Script' }}
          </h2>
          <button
            class="close-button"
            aria-label="Close"
            @click="cancel"
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

        <div class="editor-content">
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
    </Transition>

    <!-- Script Reader Overlay -->
    <Transition name="slide-right">
      <ScriptReaderOverlay
        v-if="selectedScript"
        :script="selectedScript"
        @close="closeReader"
      />
    </Transition>
  </div>
</template>

<style scoped>
/* Slide right transition for reader overlay */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* Fade transition for loading state */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

/* Page loaded wrapper */
.page-loaded {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.scripts-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--surface);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
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

.page-title-section {
  padding: 1.5rem 1.5rem 0;
}

.page-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem 1.5rem;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.search-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.new-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  border-radius: 0.5rem;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.new-button:hover {
  background: var(--accent-hover);
}

.empty-state {
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

@media (max-width: 640px) {
  .page-header {
    padding: 0.625rem 1rem;
  }

  .page-content {
    padding: 1rem;
  }

  .toolbar {
    flex-direction: column;
  }

  .new-button {
    justify-content: center;
  }
}

/* Editor Overlay */
.editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Slide up transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
