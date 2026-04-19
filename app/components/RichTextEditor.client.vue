<script setup lang="ts">
import { Ckeditor } from '@ckeditor/ckeditor5-vue'
import {
  ClassicEditor,
  Essentials,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  Paragraph,
  List,
  Alignment,
  PasteFromOffice,
  Undo,
  FontColor,
  FontBackgroundColor,
  FontSize,
  RemoveFormat,
  GeneralHtmlSupport,
} from 'ckeditor5'
import 'ckeditor5/ckeditor5.css'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  readOnly?: boolean
  showToolbar?: boolean
}>(), {
  readOnly: false,
  showToolbar: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'ready': [editor: { ui?: { getEditableElement?: (rootName?: string) => HTMLElement | undefined } }]
}>()

const data = ref(props.modelValue)

watch(() => props.modelValue, (value) => {
  if (value !== data.value) {
    data.value = value
  }
})

const config = computed(() => ({
  licenseKey: 'GPL',
  plugins: [
    Essentials,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading,
    Paragraph,
    List,
    Alignment,
    PasteFromOffice,
    Undo,
    FontColor,
    FontBackgroundColor,
    FontSize,
    RemoveFormat,
    GeneralHtmlSupport,
  ],
  toolbar: {
    items: [
      'undo', 'redo',
      '|',
      'heading',
      '|',
      'bold', 'italic', 'underline', 'strikethrough',
      '|',
      'fontSize', 'fontColor', 'fontBackgroundColor',
      '|',
      'alignment',
      '|',
      'bulletedList', 'numberedList',
      '|',
      'removeFormat',
    ],
    shouldNotGroupWhenFull: false,
  },
  heading: {
    options: [
      { model: 'paragraph' as const, title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading1' as const, view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
      { model: 'heading2' as const, view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3' as const, view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
    ],
  },
  fontSize: {
    options: ['tiny', 'small', 'default', 'big', 'huge'],
  },
  placeholder: props.placeholder || 'Start typing or paste your script here...',
  htmlSupport: {
    allow: [
      {
        name: /.*/,
        attributes: true,
        classes: /.*/,
        styles: /.*/,
      },
    ],
  },
}))

const handleInput = (newData: string) => {
  emit('update:modelValue', newData)
}

const handleReady = (editor: any) => {
  if (props.readOnly && typeof editor?.enableReadOnlyMode === 'function') {
    editor.enableReadOnlyMode('rich-text-editor-readonly')
  }
  emit('ready', editor)
}
</script>

<template>
  <div
    class="rich-text-editor"
    :class="{
      'rich-text-editor--read-only': props.readOnly,
      'rich-text-editor--no-toolbar': props.showToolbar === false,
    }"
  >
    <Ckeditor
      v-model="data"
      :editor="ClassicEditor"
      :config="config"
      @ready="handleReady"
      @update:model-value="handleInput"
    />
  </div>
</template>

<style>
/* CKEditor Theme Customization - Luminous Parchment */
.rich-text-editor {
  --ck-color-base-background: var(--input-bg);
  --ck-color-base-border: var(--border-subtle);
  --ck-color-base-text: var(--text-primary);
  --ck-color-toolbar-background: var(--surface-elevated);
  --ck-color-toolbar-border: var(--border-subtle);
  --ck-color-button-default-hover-background: var(--button-secondary-bg);
  --ck-color-button-on-background: var(--accent-subtle);
  --ck-color-button-on-hover-background: var(--accent-subtle);
  --ck-color-focus-border: var(--accent);
  --ck-color-input-background: var(--input-bg);
  --ck-color-input-border: var(--border-subtle);
  --ck-color-panel-background: var(--surface-elevated);
  --ck-color-panel-border: var(--border-subtle);
  --ck-color-dropdown-panel-background: var(--surface-elevated);
  --ck-color-dropdown-panel-border: var(--border-subtle);
  --ck-border-radius: 0.5rem;
  --ck-focus-ring: 2px solid var(--accent);
  --ck-inner-shadow: none;
  --ck-drop-shadow: 0 4px 20px var(--shadow-color);
}

.rich-text-editor .ck.ck-editor {
  width: 100%;
}

.rich-text-editor .ck.ck-editor__main > .ck-editor__editable {
  min-height: 100px;
  font-family: var(--font-script);
  font-size: 1.125rem;
  line-height: 1.8;
  padding: 1.5rem;
  background: var(--input-bg);
  border-color: var(--border-subtle);
  border-radius: 0 0 0.5rem 0.5rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.rich-text-editor .ck.ck-editor__main > .ck-editor__editable:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.rich-text-editor .ck.ck-toolbar {
  background: var(--surface-elevated);
  border-color: var(--border-subtle);
  border-radius: 0.5rem 0.5rem 0 0;
  padding: 0.5rem;
}

.rich-text-editor--no-toolbar .ck.ck-toolbar {
  display: none;
}

.rich-text-editor--no-toolbar .ck.ck-editor__main > .ck-editor__editable {
  border-radius: 0.5rem;
}

.rich-text-editor--read-only .ck.ck-editor__main > .ck-editor__editable {
  cursor: default;
}

.rich-text-editor .ck.ck-toolbar .ck-toolbar__separator {
  background: var(--border-subtle);
}

.rich-text-editor .ck.ck-button {
  color: var(--text-secondary);
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.rich-text-editor .ck.ck-button:hover {
  background: var(--button-secondary-bg);
  color: var(--text-primary);
}

.rich-text-editor .ck.ck-button.ck-on {
  background: var(--accent-subtle);
  color: var(--accent);
}

.rich-text-editor .ck.ck-dropdown__panel {
  background: var(--surface-elevated);
  border-color: var(--border-subtle);
  border-radius: 0.5rem;
  box-shadow: 0 4px 20px var(--shadow-color);
}

/* Dark theme adjustments */
.dark .rich-text-editor .ck.ck-editor__main > .ck-editor__editable {
  background: var(--input-bg);
  color: var(--text-primary);
}

.dark .rich-text-editor .ck.ck-toolbar {
  background: var(--surface-elevated);
}

.dark .rich-text-editor .ck.ck-button {
  color: var(--text-secondary);
}

.dark .rich-text-editor .ck.ck-button:hover {
  color: var(--text-primary);
}

/* Editor content styling */
.rich-text-editor .ck-content h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.rich-text-editor .ck-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.625rem;
  color: var(--text-primary);
}

.rich-text-editor .ck-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.rich-text-editor .ck-content p {
  margin-bottom: 0.75rem;
}

.rich-text-editor .ck-content ul,
.rich-text-editor .ck-content ol {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.rich-text-editor .ck-content li {
  margin-bottom: 0.25rem;
}

/* Loading state */
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
