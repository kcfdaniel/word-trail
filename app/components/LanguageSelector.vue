<script setup lang="ts">
const props = defineProps<{
  currentLanguage: string
}>()

const emit = defineEmits<{
  select: [language: string]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const dropdownRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const highlightedIndex = ref(-1) // -1 means no highlight

// Common speech recognition languages with native names
const languages = [
  { code: 'en-US', name: 'English', native: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English', native: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'es-MX', name: 'Spanish', native: 'Español (MX)', flag: '🇲🇽' },
  { code: 'fr-FR', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese', native: 'Português (BR)', flag: '🇧🇷' },
  { code: 'pt-PT', name: 'Portuguese', native: 'Português (PT)', flag: '🇵🇹' },
  { code: 'zh-CN', name: 'Chinese', native: '中文 (简体)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese', native: '中文 (繁體)', flag: '🇹🇼' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'ru-RU', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'ar-SA', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl-NL', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl-PL', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
  { code: 'sv-SE', name: 'Swedish', native: 'Svenska', flag: '🇸🇪' },
  { code: 'da-DK', name: 'Danish', native: 'Dansk', flag: '🇩🇰' },
  { code: 'fi-FI', name: 'Finnish', native: 'Suomi', flag: '🇫🇮' },
  { code: 'no-NO', name: 'Norwegian', native: 'Norsk', flag: '🇳🇴' },
  { code: 'th-TH', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { code: 'vi-VN', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id-ID', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms-MY', name: 'Malay', native: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tr-TR', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'cs-CZ', name: 'Czech', native: 'Čeština', flag: '🇨🇿' },
  { code: 'el-GR', name: 'Greek', native: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'he-IL', name: 'Hebrew', native: 'עברית', flag: '🇮🇱' },
  { code: 'uk-UA', name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' },
  { code: 'yue-Hant-HK', name: 'Cantonese', native: '廣東話', flag: '🇭🇰' }
]

const currentLang = computed(() => {
  return languages.find(l => l.code === props.currentLanguage) || languages[0]
})

const filteredLanguages = computed(() => {
  if (!searchQuery.value.trim()) return languages

  const query = searchQuery.value.toLowerCase().trim()
  return languages.filter(lang =>
    lang.name.toLowerCase().includes(query)
    || lang.native.toLowerCase().includes(query)
    || lang.code.toLowerCase().includes(query)
  )
})

// Highlight first result when filtered results change
watch(filteredLanguages, (newFiltered) => {
  highlightedIndex.value = newFiltered.length > 0 ? 0 : -1
})

const toggleDropdown = () => {
  if (isOpen.value) {
    closeDropdown()
  } else {
    isOpen.value = true
    searchQuery.value = ''
    highlightedIndex.value = -1
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}

const closeDropdown = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const selectLanguage = (code: string) => {
  emit('select', code)
  closeDropdown()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      // Start from 0 if nothing highlighted, otherwise increment
      if (highlightedIndex.value < 0) {
        highlightedIndex.value = 0
      } else {
        highlightedIndex.value = Math.min(
          highlightedIndex.value + 1,
          filteredLanguages.value.length - 1
        )
      }
      scrollToHighlighted()
      break
    case 'ArrowUp':
      event.preventDefault()
      // Start from last item if nothing highlighted, otherwise decrement
      if (highlightedIndex.value < 0) {
        highlightedIndex.value = filteredLanguages.value.length - 1
      } else {
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      }
      scrollToHighlighted()
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        const highlighted = filteredLanguages.value[highlightedIndex.value]
        if (highlighted) {
          selectLanguage(highlighted.code)
        }
      }
      break
    case 'Escape':
      event.preventDefault()
      closeDropdown()
      break
  }
}

const scrollToHighlighted = () => {
  nextTick(() => {
    const highlighted = dropdownRef.value?.querySelector('.dropdown-item--highlighted')
    highlighted?.scrollIntoView({ block: 'nearest' })
  })
}

// Close on click outside
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="dropdownRef"
    class="language-selector"
  >
    <button
      class="selector-button"
      :class="{ 'selector-button--open': isOpen }"
      :title="`Language: ${currentLang?.native}`"
      @click="toggleDropdown"
    >
      <span class="selector-flag">{{ currentLang?.flag }}</span>
      <span class="selector-code">{{ currentLanguage.split('-')[0]?.toUpperCase() }}</span>
      <svg
        class="selector-chevron"
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="dropdown"
      >
        <div class="dropdown-search">
          <svg
            class="search-icon"
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
              cx="11"
              cy="11"
              r="8"
            />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Search languages..."
            @keydown="handleKeydown"
          >
        </div>
        <div class="dropdown-list">
          <button
            v-for="(lang, index) in filteredLanguages"
            :key="lang.code"
            class="dropdown-item"
            :class="{
              'dropdown-item--selected': lang.code === currentLanguage,
              'dropdown-item--highlighted': index === highlightedIndex
            }"
            @click="selectLanguage(lang.code)"
            @mouseenter="highlightedIndex = index"
          >
            <span class="item-flag">{{ lang.flag }}</span>
            <span class="item-info">
              <span class="item-native">{{ lang.native }}</span>
              <span class="item-code">{{ lang.code }}</span>
            </span>
            <svg
              v-if="lang.code === currentLanguage"
              class="item-check"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <div
            v-if="filteredLanguages.length === 0"
            class="dropdown-empty"
          >
            No languages found
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.language-selector {
  position: relative;
}

.selector-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  background: var(--button-secondary-bg, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.1));
  border-radius: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 500;
}

.selector-button:hover {
  background: var(--button-secondary-hover, rgba(0, 0, 0, 0.08));
  border-color: var(--border-medium, rgba(0, 0, 0, 0.15));
}

.selector-button--open {
  background: var(--accent-subtle, rgba(200, 120, 50, 0.1));
  border-color: var(--accent, #c87832);
  color: var(--accent, #c87832);
}

.selector-flag {
  font-size: 1rem;
  line-height: 1;
}

.selector-code {
  letter-spacing: 0.02em;
}

.selector-chevron {
  transition: transform 0.2s ease;
  opacity: 0.6;
}

.selector-button--open .selector-chevron {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 280px;
  max-height: 400px;
  background: var(--surface-elevated, #fff);
  border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.1));
  border-radius: 0.75rem;
  box-shadow:
    0 4px 20px var(--shadow-color, rgba(0, 0, 0, 0.1)),
    0 0 0 1px var(--border-subtle, rgba(0, 0, 0, 0.05));
  overflow: hidden;
  z-index: 100;
}

.dropdown-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--surface-muted, #f5f5f5);
  border-bottom: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.1));
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
  font-size: 0.8125rem;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.dropdown-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 0.375rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.dropdown-item:hover,
.dropdown-item--highlighted {
  background: var(--surface-muted, rgba(0, 0, 0, 0.04));
}

.dropdown-item--selected {
  background: var(--accent-subtle, rgba(200, 120, 50, 0.1));
}

.dropdown-item--selected:hover,
.dropdown-item--selected.dropdown-item--highlighted {
  background: var(--accent-subtle, rgba(200, 120, 50, 0.15));
}

.dropdown-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.8125rem;
}

.item-flag {
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.item-native {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-code {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono, monospace);
}

.item-check {
  flex-shrink: 0;
  color: var(--accent, #c87832);
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

/* Scrollbar */
.dropdown-list::-webkit-scrollbar {
  width: 6px;
}

.dropdown-list::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown-list::-webkit-scrollbar-thumb {
  background: var(--border-subtle, rgba(0, 0, 0, 0.15));
  border-radius: 3px;
}

.dropdown-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-medium, rgba(0, 0, 0, 0.25));
}
</style>
