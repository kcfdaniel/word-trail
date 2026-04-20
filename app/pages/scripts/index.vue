<script setup lang="ts">
import type { Script } from '~/composables/useScriptManager'
import { htmlToPlainText } from '~/utils/richText'

const router = useRouter()
const { t } = useI18n()

const pushAd = () => {
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] }
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.push({})
  }
  catch (e) {
    console.error('AdSense push failed:', e)
  }
}

const {
  scripts,
  currentScript,
  isLoaded,
  createScript,
  updateScript,
  deleteScript,
  setCurrentScript,
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
const contentHtml = ref('')
const initialTitle = ref('')
const initialContentHtml = ref('')

const hasUnsavedChanges = computed(() => {
  return title.value !== initialTitle.value || contentHtml.value !== initialContentHtml.value
})

const discardMessage = computed(() => t('scripts.unsavedConfirm'))

const wordCount = computed(() => {
  return htmlToPlainText(contentHtml.value).split(/\s+/).filter(w => w.trim().length > 0).length
})

// Filter and sort scripts: search by title, sort by updatedAt descending
const filteredScripts = computed(() => {
  let result = [...scripts.value]

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(script =>
      script.title.toLowerCase().includes(query),
    )
  }

  // Sort by updatedAt descending (latest first)
  result.sort((a, b) => b.updatedAt - a.updatedAt)

  return result
})

const openNew = () => {
  mode.value = 'new'
  editingScript.value = null
  setCurrentScript(null)
  initialTitle.value = ''
  initialContentHtml.value = ''
  title.value = ''
  contentHtml.value = ''
}

const openEdit = (script: Script) => {
  mode.value = 'edit'
  editingScript.value = script
  setCurrentScript(script)
  initialTitle.value = script.title
  initialContentHtml.value = script.contentHtml
  title.value = script.title
  contentHtml.value = script.contentHtml
}

const save = () => {
  if (!htmlToPlainText(contentHtml.value).trim()) return

  const savedTitle = title.value || t('common.untitledScript')
  if (mode.value === 'new') {
    createScript(savedTitle, contentHtml.value)
  }
  else if (editingScript.value) {
    updateScript(editingScript.value.id, {
      title: savedTitle,
      contentHtml: contentHtml.value,
    })
  }

  initialTitle.value = savedTitle
  initialContentHtml.value = contentHtml.value
  mode.value = 'list'
}

const confirmDiscard = () => {
  if (!hasUnsavedChanges.value) return true
  return confirm(discardMessage.value)
}

const cancel = () => {
  if (!confirmDiscard()) return
  mode.value = 'list'
  editingScript.value = null
  title.value = ''
  contentHtml.value = ''
  initialTitle.value = ''
  initialContentHtml.value = ''
}

const confirmDelete = (script: Script) => {
  if (confirm(t('scripts.deleteConfirm', { title: script.title }))) {
    deleteScript(script.id)
  }
}

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

const scriptPreview = (script: Script) => {
  const text = htmlToPlainText(script.contentHtml)
  return `${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  nextTick(pushAd)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

onBeforeRouteLeave(() => {
  if (confirmDiscard()) return true
  return false
})
</script>

<template>
  <div class="scripts-page">
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

      <div
        v-else
        class="page-loaded"
      >
        <!-- Page Title -->
        <div class="page-title-section">
          <h1 class="page-title">
            {{ $t('scripts.pageTitle') }}
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
                :placeholder="$t('scripts.searchPlaceholder')"
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
              {{ $t('scripts.newButton') }}
            </button>
          </div>

          <!-- Scripts List -->
          <div
            v-if="filteredScripts.length === 0 && searchQuery"
            class="empty-state"
          >
            <p>{{ $t('scripts.noResults', { query: searchQuery }) }}</p>
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
              @click="setCurrentScript(script)"
            >
              <div class="script-item-content">
                <h3 class="script-item-title">
                  {{ script.title }}
                </h3>
                <p class="script-item-preview">
                  {{ scriptPreview(script) }}
                </p>
                <span class="script-item-date">{{ formatDate(script.updatedAt) }}</span>
              </div>
              <div class="script-item-actions">
                <button
                  class="action-button"
                  :title="$t('common.edit')"
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
                  :title="$t('common.delete')"
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

        <!-- Bottom ad banner -->
        <div class="ad-banner">
          <ins
            class="adsbygoogle"
            style="display:block; width:100%;"
            data-ad-client="ca-pub-1449646914986604"
            data-ad-slot="YOUR_AD_SLOT_ID"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
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
            {{ mode === 'new' ? $t('scripts.newScriptTitle') : $t('scripts.editScriptTitle') }}
          </h2>
          <button
            class="close-button"
            :aria-label="$t('common.close')"
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
            >{{ $t('scripts.titleLabel') }}</label>
            <input
              id="script-title"
              v-model="title"
              type="text"
              class="form-input"
              :placeholder="$t('scripts.titlePlaceholder')"
            >
          </div>

          <div class="form-group form-group--grow">
            <label
              for="script-content"
              class="form-label"
            >
              {{ $t('scripts.contentLabel') }}
              <span class="word-count">{{ $t('scripts.wordCount', { count: wordCount }, wordCount) }}</span>
            </label>
            <div class="editor-wrapper">
              <ClientOnly>
                <RichTextEditor
                  v-model="contentHtml"
                  :placeholder="$t('scripts.contentPlaceholder')"
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

          <div class="form-actions">
            <button
              class="form-button form-button--secondary"
              @click="cancel"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              class="form-button form-button--primary"
              :disabled="!htmlToPlainText(contentHtml).trim()"
              @click="save"
            >
              {{ mode === 'new' ? $t('scripts.createButton') : $t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Script Reader Overlay -->
    <Transition name="slide-right">
      <ScriptReaderOverlay
        v-if="currentScript"
        @close="setCurrentScript(null)"
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
  height: 100%;
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
  height: 100%;
}

.scripts-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
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

.ad-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 0.5rem 1rem;
  background: var(--surface-elevated);
  border-top: 1px solid var(--border-subtle);
}

.ad-banner .adsbygoogle {
  max-width: 100%;
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

.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 300px;
  background: var(--input-bg);
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

.form-actions {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  padding-bottom: 0.25rem;
  background: var(--surface);
  border-top: 1px solid var(--border-subtle);
  box-shadow: 0 -1px 0 var(--border-subtle);
  margin-top: auto;
  z-index: 1;
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
  min-height: 0;
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
