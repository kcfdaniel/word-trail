export interface MatchResult {
  index: number
  word: string
}

/**
 * Normalize word for comparison
 * Removes punctuation, dashes, and converts to lowercase
 */
const normalizeWord = (word: string): string => {
  return word
    .toLowerCase()
    .replace(/[\u00AD\u2010-\u2015\u2212]/g, '') // soft hyphens, dashes
    .replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, '') // keep letters, numbers, CJK
    .trim()
}

/**
 * Split text into words, handling both CJK and Latin scripts
 * CJK characters are split individually, Latin words by whitespace
 */
const splitWords = (text: string): string[] => {
  const CJK_RANGE = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/
  const results: string[] = []
  let currentWord = ''

  for (const char of text) {
    if (CJK_RANGE.test(char)) {
      // CJK character - flush current word, add CJK char as its own word
      if (currentWord.trim()) {
        results.push(currentWord.trim())
        currentWord = ''
      }
      results.push(char)
    } else if (/\s/.test(char)) {
      // Whitespace - flush current word
      if (currentWord.trim()) {
        results.push(currentWord.trim())
        currentWord = ''
      }
    } else {
      // Other characters (Latin, punctuation) - accumulate
      currentWord += char
    }
  }

  // Flush remaining
  if (currentWord.trim()) {
    results.push(currentWord.trim())
  }

  return results
}

/**
 * Check if two words are similar enough to be considered a match
 * Uses prefix matching and character overlap
 */
const wordsSimilar = (spoken: string, script: string): boolean => {
  const a = normalizeWord(spoken)
  const b = normalizeWord(script)

  if (a === b) return true
  if (a.length === 0 || b.length === 0) return false

  // For very short words (1-2 chars), require exact match
  if (a.length <= 2 || b.length <= 2) return a === b

  // Check if one is prefix of other (speech recognition often cuts words)
  if (a.startsWith(b) || b.startsWith(a)) return true

  // Check character overlap ratio
  const maxLen = Math.max(a.length, b.length)
  const minLen = Math.min(a.length, b.length)
  let matches = 0

  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matches++
  }

  return matches / maxLen >= 0.75
}

/**
 * Check if two words are exactly the same (after normalization)
 */
const wordsExactMatch = (spoken: string, script: string): boolean => {
  return normalizeWord(spoken) === normalizeWord(script)
}

export const useFuzzyMatch = () => {
  // Configuration
  const MAX_SPOKEN_WORDS = 20    // Max spoken words to consider for matching
  const MAX_LOOKAHEAD = 200       // Max words to look ahead when matching
  const MIN_REQUIRED_MATCHES = 2 // Minimum matches required
  const MAX_REQUIRED_MATCHES = 15 // Maximum matches required
  const DISTANCE_DIVISOR = 2     // Distance divisor for calculating required matches

  /**
   * Find best match using sequence-aligned greedy matching
   *
   * Key insight: The spoken words form a contiguous sequence that should align
   * with the script. Instead of matching from currentIndex + 1, we match from
   * currentIndex - sequenceLength + 1, ensuring the sequence aligns correctly.
   *
   * Rules:
   * - If only 1-2 words: only match if spoken word exactly equals the next expected word
   * - If 3+ words: use sequence-aligned greedy forward matching
   *
   * @param spokenWords - All accumulated words spoken (keeps growing during continuous speech)
   * @param scriptWords - Words to search within
   * @param currentIndex - Currently highlighted word index (-1 if none)
   */
  const findBestMatch = (
    spokenWords: string[],
    scriptWords: { id: number, text: string }[],
    currentIndex: number
  ): MatchResult | null => {
    if (spokenWords.length === 0 || scriptWords.length === 0) return null

    const nextExpectedIndex = currentIndex + 1
    const nextWord = scriptWords.find(w => w.id === nextExpectedIndex)

    console.log("spokenWords.length", spokenWords.length);
    // Rule 1: Single word - only match if it exactly equals the next expected word
    if (spokenWords.length === 1) {
      if (nextWord && wordsExactMatch(spokenWords[0]!, nextWord.text)) {
        console.log("MATCH");
        console.log({scriptWords});
        console.log(nextWord);
        return { index: nextExpectedIndex, word: nextWord.text }
      }
      return null // Single word doesn't match next word, reject
    }

    // Rule 2: Two words - also require exact match on next word for the last spoken word
    if (spokenWords.length === 2) {
      if (nextWord && wordsExactMatch(spokenWords[1]!, nextWord.text)) {
        return { index: nextExpectedIndex, word: nextWord.text }
      }
      // Check if second word matches word after next
      const wordAfterNext = scriptWords.find(w => w.id === nextExpectedIndex + 1)
      if (nextWord && wordAfterNext) {
        if (wordsExactMatch(spokenWords[0]!, nextWord.text) &&
          wordsExactMatch(spokenWords[1]!, wordAfterNext.text)) {
          return { index: nextExpectedIndex + 1, word: wordAfterNext.text }
        }
      }
      return null
    }

    // Rule 3: 3+ words - use sequence-aligned greedy forward matching
    // Limit to last MAX_SPOKEN_WORDS spoken words
    const limitedSpokenWords = spokenWords.length > MAX_SPOKEN_WORDS
      ? spokenWords.slice(-MAX_SPOKEN_WORDS)
      : spokenWords

    // Calculate where the sequence should START in the script
    // If we have N words and current position is P, sequence starts at P - N + 1
    const sequenceStartIndex = Math.max(0, currentIndex - limitedSpokenWords.length + 1)

    // Find starting position in scriptWords array
    const startArrayIdx = scriptWords.findIndex(w => w.id >= sequenceStartIndex)
    if (startArrayIdx < 0) return null

    // Greedy forward matching with extended lookahead
    // Track match indices to filter by valid window later
    let scriptIdx = startArrayIdx
    let lastMatchedId = -1
    let lastMatchedWord = ''
    const matchIndices: number[] = []

    for (const spoken of limitedSpokenWords) {
      if (scriptIdx >= scriptWords.length) break

      // Lookahead up to MAX_LOOKAHEAD words ahead
      const maxLookahead = Math.min(scriptIdx + MAX_LOOKAHEAD, scriptWords.length)

      for (let j = scriptIdx; j < maxLookahead; j++) {
        const candidate = scriptWords[j]
        if (!candidate) break

        if (wordsSimilar(spoken, candidate.text)) {
          lastMatchedId = candidate.id
          lastMatchedWord = candidate.text
          scriptIdx = j + 1
          matchIndices.push(candidate.id)
          break
        }
      }

      // If no match found, allow skipping this spoken word
      // (speech recognition might have extra words)
    }

    // Only count matches within the valid window
    // If we have N spoken words ending at position P, valid range is [P - N, P]
    // Discard any indices smaller than lastMatchedId - limitedSpokenWords.length
    const validWindowStart = Math.max(0, lastMatchedId - limitedSpokenWords.length)
    const validMatchCount = matchIndices.filter(idx => idx >= validWindowStart).length

    // Calculate required matches based on distance from current position
    // The further the jump, the more matches required
    const distance = lastMatchedId - currentIndex
    const requiredMatches = Math.max(
      MIN_REQUIRED_MATCHES,
      Math.min(MAX_REQUIRED_MATCHES, Math.ceil(distance / DISTANCE_DIVISOR) + 1),
      Math.min(MAX_REQUIRED_MATCHES, Math.ceil(limitedSpokenWords.length * 0.75))
    )

    // debug log
    // console.log({
    //   distance,
    //   lastMatchedId,
    //   requiredMatches,
    //   limitedSpokenWords,
    //   matchIndices: matchIndices.filter(idx => idx >= validWindowStart),
    //   matchWords: matchIndices.filter(idx => idx >= validWindowStart).map(idx => scriptWords[idx]?.text),
    //   startArrayIdx,
    //   sequenceStartIndex
    // })

    // Result must advance beyond current position AND meet match requirement
    if (lastMatchedId > currentIndex && validMatchCount >= requiredMatches) {
      return {
        index: lastMatchedId,
        word: lastMatchedWord
      }
    }

    return null
  }

  return {
    findBestMatch,
    wordsSimilar,
    wordsExactMatch,
    normalizeWord,
    splitWords
  }
}
