/**
 * CSS Custom Highlight API based word highlighting
 *
 * This composable provides word-by-word highlighting for rich text content
 * without modifying the DOM structure, preserving all formatting.
 */

export interface WordPosition {
  index: number
  text: string
  normalizedText: string
  node: Text
  start: number
  end: number
}

export interface HighlightState {
  currentIndex: number
  progress: number
  isActive: boolean
}

// Check if CSS Custom Highlight API is supported
export const isHighlightApiSupported = (): boolean => {
  return typeof CSS !== 'undefined' && 'highlights' in CSS
}

/**
 * Normalize word for matching (same logic as useSpeechMatch)
 */
const normalizeWord = (word: string): string => {
  return word
    .toLowerCase()
    .replace(/[\u00AD\u2010-\u2015]/g, '') // Remove soft hyphens and dashes
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/gu, '') // Keep letters, numbers, CJK
    .trim()
}

/**
 * Check if a character is CJK
 */
const isCJK = (char: string): boolean => {
  return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(char)
}

/**
 * Check if character is CJK punctuation
 */
const isCJKPunctuation = (char: string): boolean => {
  return /[\u3000-\u303f\uff00-\uffef\u2000-\u206f]/.test(char)
}

/**
 * Build word position index from DOM using TreeWalker
 */
export const buildWordIndex = (container: HTMLElement): WordPosition[] => {
  const words: WordPosition[] = []

  // Use TreeWalker to find all text nodes
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip empty or whitespace-only nodes
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  let textNode: Text | null
  let globalIndex = 0

  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent || ''
    let i = 0

    while (i < text.length) {
      const char = text[i]!

      // Skip whitespace
      if (/\s/.test(char)) {
        i++
        continue
      }

      const wordStart = i
      let wordText = ''

      if (isCJK(char)) {
        // CJK character - single character is a word
        wordText = char
        i++
        // Include trailing CJK punctuation
        while (i < text.length && isCJKPunctuation(text[i]!)) {
          wordText += text[i]
          i++
        }
      }
      else {
        // Non-CJK - accumulate until whitespace or CJK
        while (i < text.length && !/\s/.test(text[i]!) && !isCJK(text[i]!)) {
          wordText += text[i]
          i++
        }
      }

      if (wordText.trim()) {
        const normalized = normalizeWord(wordText)
        if (normalized) {
          words.push({
            index: globalIndex,
            text: wordText,
            normalizedText: normalized,
            node: textNode,
            start: wordStart,
            end: wordStart + wordText.length,
          })
          globalIndex++
        }
      }
    }
  }

  return words
}

// Module-level singleton state so every caller of useRichTextHighlight()
// shares the same wordPositions / currentIndex. Without this, the teleprompter
// component builds the index into its own instance while the reader overlay's
// instance stays empty — matching and highlighting silently no-op.
const scrollContainerRef = ref<HTMLElement | null>(null)
const indexContainerRef = ref<HTMLElement | null>(null)
const wordPositions = ref<WordPosition[]>([])
const currentIndex = ref(-1)
const isSupported = ref(false)
let supportedInitialized = false

const ACTIVE_HIGHLIGHT = 'wordtrail-active'
const COMPLETED_HIGHLIGHT = 'wordtrail-completed'

/**
 * Main composable for rich text highlighting
 */
export const useRichTextHighlight = () => {
  if (!supportedInitialized && typeof window !== 'undefined') {
    isSupported.value = isHighlightApiSupported()
    supportedInitialized = true
  }

  /**
   * Initialize word index from container
   */
  const initializeWordIndex = (container: HTMLElement, scrollContainer: HTMLElement = container) => {
    indexContainerRef.value = container
    scrollContainerRef.value = scrollContainer
    wordPositions.value = buildWordIndex(container)
    currentIndex.value = -1
    clearAllHighlights()
  }

  /**
   * Clear all highlights
   */
  const clearAllHighlights = () => {
    if (!isSupported.value) return

    CSS.highlights.delete(ACTIVE_HIGHLIGHT)
    CSS.highlights.delete(COMPLETED_HIGHLIGHT)
  }

  /**
   * Update highlights based on current position
   */
  const updateHighlights = () => {
    if (!isSupported.value || wordPositions.value.length === 0) return

    clearAllHighlights()

    const completedRanges: Range[] = []
    const activeRanges: Range[] = []
    // Pending words don't need special highlighting - they use default styling

    wordPositions.value.forEach((word, idx) => {
      try {
        const range = new Range()
        range.setStart(word.node, word.start)
        range.setEnd(word.node, word.end)

        if (idx < currentIndex.value) {
          completedRanges.push(range)
        }
        else if (idx === currentIndex.value) {
          activeRanges.push(range)
        }
      }
      catch (e) {
        // Range might be invalid if DOM changed
        console.warn('Failed to create range for word:', word.text, e)
      }
    })

    if (completedRanges.length > 0) {
      CSS.highlights.set(COMPLETED_HIGHLIGHT, new Highlight(...completedRanges))
    }
    if (activeRanges.length > 0) {
      CSS.highlights.set(ACTIVE_HIGHLIGHT, new Highlight(...activeRanges))
    }
  }

  /**
   * Move to a specific word index
   */
  const moveTo = (targetIndex: number) => {
    if (targetIndex < -1 || targetIndex >= wordPositions.value.length) return

    currentIndex.value = targetIndex
    updateHighlights()

    // Scroll active word into view
    if (targetIndex >= 0 && targetIndex < wordPositions.value.length) {
      const word = wordPositions.value[targetIndex]
      if (word) {
        scrollWordIntoView(word)
      }
    }
  }

  /**
   * Handle match from speech recognition
   */
  const handleMatch = (matchIndex: number) => {
    // Only move forward or allow small rewinds (same logic as original)
    if (matchIndex > currentIndex.value || matchIndex >= currentIndex.value - 3) {
      moveTo(matchIndex)
    }
  }

  /**
   * Set position manually (e.g., user clicked a word)
   */
  const setPositionAt = (targetIndex: number) => {
    moveTo(targetIndex)
  }

  /**
   * Reset progress to beginning
   */
  const resetProgress = () => {
    currentIndex.value = -1
    clearAllHighlights()
  }

  /**
   * Scroll word into view smoothly
   */
  const scrollWordIntoView = (word: WordPosition) => {
    try {
      const range = document.createRange()
      range.setStart(word.node, word.start)
      range.setEnd(word.node, word.end)

      const rect = range.getBoundingClientRect()
      const container = scrollContainerRef.value

      if (container) {
        const containerRect = container.getBoundingClientRect()
        const scrollTarget = container.scrollTop + (rect.top - containerRect.top) - (containerRect.height / 2) + (rect.height / 2)

        container.scrollTo({
          top: scrollTarget,
          behavior: 'smooth',
        })
      }
    }
    catch {
      // Fallback: no scrolling if range is invalid
    }
  }

  /**
   * Get word at click position
   */
  const getWordAtPoint = (x: number, y: number): WordPosition | null => {
    if (!indexContainerRef.value) return null

    // Use caretPositionFromPoint or caretRangeFromPoint
    let range: Range | null = null

    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y)
      if (pos && pos.offsetNode) {
        range = document.createRange()
        range.setStart(pos.offsetNode, pos.offset)
        range.setEnd(pos.offsetNode, pos.offset)
      }
    }
    else if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y)
    }

    if (!range) return null

    const clickedNode = range.startContainer
    const clickedOffset = range.startOffset

    // Find which word contains this position
    for (const word of wordPositions.value) {
      if (word.node === clickedNode
        && clickedOffset >= word.start
        && clickedOffset <= word.end) {
        return word
      }
    }

    return null
  }

  /**
   * Get progress percentage
   */
  const progress = computed(() => {
    if (wordPositions.value.length === 0) return 0
    const completed = currentIndex.value + 1
    return Math.round((completed / wordPositions.value.length) * 100)
  })

  /**
   * Get normalized words for fuzzy matching
   */
  const getNormalizedWords = computed(() => {
    return wordPositions.value.map(w => ({
      id: w.index,
      text: w.text,
      normalizedText: w.normalizedText,
    }))
  })

  return {
    // State
    wordPositions: readonly(wordPositions),
    currentIndex: readonly(currentIndex),
    progress,
    isSupported: readonly(isSupported),
    getNormalizedWords,

    // Actions
    initializeWordIndex,
    moveTo,
    handleMatch,
    setPositionAt,
    resetProgress,
    getWordAtPoint,
    clearAllHighlights,
  }
}
