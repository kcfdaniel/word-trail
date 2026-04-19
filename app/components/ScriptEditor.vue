<script setup lang="ts">
import { htmlToPlainText } from '~/utils/richText'

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const { currentScript, updateScript } = useScriptManager()

const title = ref('')
const contentHtml = ref('')
const initialTitle = ref('')
const initialContentHtml = ref('')

const hasUnsavedChanges = computed(() => {
  return title.value !== initialTitle.value || contentHtml.value !== initialContentHtml.value
})

const discardMessage = computed(() => t('scripts.unsavedConfirm'))

const wordCount = computed(() => {
  const text = htmlToPlainText(contentHtml.value)
  return text.split(/\s+/).filter(w => w.trim().length > 0).length
})

const syncDraft = (script: { title: string, contentHtml: string } | null) => {
  initialTitle.value = script?.title ?? ''
  initialContentHtml.value = script?.contentHtml ?? ''
  title.value = initialTitle.value
  contentHtml.value = initialContentHtml.value
}

watch(currentScript, (script) => {
  if (script) {
    syncDraft(script)
  }
}, { immediate: true })

const confirmDiscard = () => !hasUnsavedChanges.value || confirm(discardMessage.value)

const attemptClose = () => {
  if (confirmDiscard()) {
    emit('close')
  }
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const save = () => {
  if (!htmlToPlainText(contentHtml.value).trim() || !currentScript.value) return

  const savedTitle = title.value || t('common.untitledScript')
  const savedContentHtml = contentHtml.value

  updateScript(currentScript.value.id, { title: savedTitle, contentHtml: savedContentHtml })
  initialTitle.value = savedTitle
  initialContentHtml.value = savedContentHtml
  emit('close')
}
</script>

<template>
  <div class="script-editor">
    <!-- Header -->
    <div class="editor-header">
      <h2 class="editor-title">
        {{ $t('editor.editTitle') }}
      </h2>
      <button
        class="close-button"
        :aria-label="$t('common.close')"
        @click="attemptClose"
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
        <label class="form-label">
          {{ $t('scripts.contentLabel') }}
          <span class="word-count">{{ $t('scripts.wordCount', { count: wordCount }, wordCount) }}</span>
        </label>
        <div class="editor-wrapper">
          <ClientOnly>
            <RichTextEditor
              v-model="contentHtml"
              :placeholder="$t('editor.editorPlaceholder')"
            />
            <template #fallback>
              <div class="editor-loading">
                <div class="editor-loading__spinner" />
                <span>{{ $t('editor.loadingEditor') }}</span>
              </div>
            </template>
          </ClientOnly>
        </div>
        <p class="editor-hint">
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
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          {{ $t('editor.tip') }}
        </p>
      </div>

      <div class="form-actions">
        <button
          class="form-button form-button--secondary"
          @click="attemptClose"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          class="form-button form-button--primary"
          :disabled="!htmlToPlainText(contentHtml).trim()"
          @click="save"
        >
          {{ $t('common.save') }}
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
  min-height: 0;
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
  min-height: 0;
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
  min-height: 0;
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

.editor-wrapper {
  flex: 1;
  min-height: 0;
  max-height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-wrapper :deep(.rich-text-editor) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-wrapper :deep(.ck.ck-editor) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-wrapper :deep(.ck.ck-editor__main) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-wrapper :deep(.ck.ck-editor__main > .ck-editor__editable) {
  flex: 1;
  min-height: 18rem;
  max-height: 100%;
  overflow-y: auto;
}

.editor-hint {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
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
</style>
