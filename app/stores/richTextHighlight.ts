import { defineStore, skipHydrate } from 'pinia'
import { buildWordIndex, isHighlightApiSupported } from '~/utils/richTextHighlight'
import type { WordPosition } from '~/utils/richTextHighlight'

const ACTIVE_HIGHLIGHT = 'wordtrail-active'
const COMPLETED_HIGHLIGHT = 'wordtrail-completed'

export const useRichTextHighlightStore = defineStore('richTextHighlight', () => {
  const wordPositions = skipHydrate(ref<WordPosition[]>([]))
  const currentIndex = ref(-1)
  const isSupported = ref(false)
  const progress = computed(() => {
    if (wordPositions.value.length === 0) return 0
    const completed = currentIndex.value + 1
    return Math.round((completed / wordPositions.value.length) * 100)
  })
  const getNormalizedWords = computed(() => {
    return wordPositions.value.map(word => ({
      id: word.index,
      text: word.text,
      normalizedText: word.normalizedText,
    }))
  })

  let indexContainer: HTMLElement | null = null
  let scrollContainer: HTMLElement | null = null
  let supportInitialized = false

  const ensureSupport = () => {
    if (supportInitialized || typeof window === 'undefined') return
    isSupported.value = isHighlightApiSupported()
    supportInitialized = true
  }

  const clearAllHighlights = () => {
    if (!isSupported.value) return

    CSS.highlights.delete(ACTIVE_HIGHLIGHT)
    CSS.highlights.delete(COMPLETED_HIGHLIGHT)
  }

  const scrollWordIntoView = (word: WordPosition) => {
    try {
      const range = document.createRange()
      range.setStart(word.node, word.start)
      range.setEnd(word.node, word.end)

      const rect = range.getBoundingClientRect()
      if (!scrollContainer) return

      const containerRect = scrollContainer.getBoundingClientRect()
      const scrollTarget = scrollContainer.scrollTop
        + (rect.top - containerRect.top)
        - (containerRect.height / 2)
        + (rect.height / 2)

      scrollContainer.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      })
    }
    catch {
      // Ignore invalid ranges when the DOM has changed.
    }
  }

  const updateHighlights = () => {
    if (!isSupported.value || wordPositions.value.length === 0) return

    clearAllHighlights()

    const completedRanges: Range[] = []
    const activeRanges: Range[] = []

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

  const initializeWordIndex = (container: HTMLElement, nextScrollContainer: HTMLElement = container) => {
    ensureSupport()
    indexContainer = container
    scrollContainer = nextScrollContainer
    wordPositions.value = buildWordIndex(container)
    currentIndex.value = -1
    clearAllHighlights()
  }

  const moveTo = (targetIndex: number) => {
    if (targetIndex < -1 || targetIndex >= wordPositions.value.length) return

    currentIndex.value = targetIndex
    updateHighlights()

    if (targetIndex < 0) return
    const word = wordPositions.value[targetIndex]
    if (word) scrollWordIntoView(word)
  }

  const handleMatch = (matchIndex: number) => {
    if (matchIndex > currentIndex.value || matchIndex >= currentIndex.value - 3) {
      moveTo(matchIndex)
    }
  }

  const setPositionAt = (targetIndex: number) => {
    moveTo(targetIndex)
  }

  const resetProgress = () => {
    currentIndex.value = -1
    clearAllHighlights()
  }

  const getWordAtPoint = (x: number, y: number): WordPosition | null => {
    if (!indexContainer) return null

    let range: Range | null = null

    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y)
      if (pos?.offsetNode) {
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

    for (const word of wordPositions.value) {
      if (word.node === clickedNode
        && clickedOffset >= word.start
        && clickedOffset <= word.end) {
        return word
      }
    }

    return null
  }

  return {
    wordPositions,
    currentIndex,
    isSupported,
    progress,
    getNormalizedWords,
    ensureSupport,
    initializeWordIndex,
    moveTo,
    handleMatch,
    setPositionAt,
    resetProgress,
    getWordAtPoint,
    clearAllHighlights,
  }
})
