export interface WordPosition {
  index: number
  text: string
  normalizedText: string
  node: Text
  start: number
  end: number
}

export const isHighlightApiSupported = (): boolean => {
  return typeof CSS !== 'undefined' && 'highlights' in CSS
}

const normalizeWord = (word: string): string => {
  return word
    .toLowerCase()
    .replace(/[\u00AD\u2010-\u2015]/g, '')
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/gu, '')
    .trim()
}

const isCJK = (char: string): boolean => {
  return /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(char)
}

const isCJKPunctuation = (char: string): boolean => {
  return /[\u3000-\u303f\uff00-\uffef\u2000-\u206f]/.test(char)
}

export const buildWordIndex = (container: HTMLElement): WordPosition[] => {
  const words: WordPosition[] = []
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
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

      if (/\s/.test(char)) {
        i++
        continue
      }

      const wordStart = i
      let wordText = ''

      if (isCJK(char)) {
        wordText = char
        i++
        while (i < text.length && isCJKPunctuation(text[i]!)) {
          wordText += text[i]
          i++
        }
      }
      else {
        while (i < text.length && !/\s/.test(text[i]!) && !isCJK(text[i]!)) {
          wordText += text[i]
          i++
        }
      }

      if (!wordText.trim()) continue

      const normalized = normalizeWord(wordText)
      if (!normalized) continue

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

  return words
}
