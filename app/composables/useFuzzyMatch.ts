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

/**
 * Common stop words to filter out for more robust matching
 * These words are too common and cause false matches
 */
const STOP_WORDS = new Set([
  // English
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from',
  'by', 'with', 'in', 'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'of', 'it', 'its', 'as', 'if', 'that',
  'which', 'who', 'whom', 'this', 'these', 'those', 'then', 'than', 'so', 'no',
  'not', 'only', 'own', 'same', 'just', 'also', 'very', 'too', 'any', 'each',
  'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she',
  'her', 'they', 'them', 'their', 'what', 'all', 'been', 'into', 'through'
])

/**
 * Check if a word is a stop word (should be filtered for matching)
 */
const isStopWord = (word: string): boolean => {
  const normalized = normalizeWord(word)
  // CJK characters are never stop words
  if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(normalized)) {
    return false
  }
  return STOP_WORDS.has(normalized)
}

/**
 * Filter array to only significant (non-stop) words
 */
const filterSignificant = (words: string[]): string[] => {
  return words.filter(w => !isStopWord(w))
}

/**
 * Windowed DP alignment for recovery scenarios
 * Used when phrase matching fails
 */
interface AlignmentResult {
  lastMatchedArrayIdx: number
  score: number
  matchCount: number
}

const alignSequencesDP = (
  spoken: string[],
  scriptWindow: { id: number, text: string }[]
): AlignmentResult => {
  const n = spoken.length
  const m = scriptWindow.length

  if (n === 0 || m === 0) {
    return { lastMatchedArrayIdx: -1, score: 0, matchCount: 0 }
  }

  const MATCH_SCORE = 3
  const MISMATCH_PENALTY = -2
  const GAP_PENALTY = -1

  const dp: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    dp[i]![0] = i * GAP_PENALTY
  }
  for (let j = 1; j <= m; j++) {
    dp[0]![j] = 0 // Free gaps at start (semi-global)
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const isMatch = wordsSimilar(spoken[i - 1]!, scriptWindow[j - 1]!.text)
      const diagScore = dp[i - 1]![j - 1]! + (isMatch ? MATCH_SCORE : MISMATCH_PENALTY)
      const upScore = dp[i - 1]![j]! + GAP_PENALTY
      const leftScore = dp[i]![j - 1]! + GAP_PENALTY
      dp[i]![j] = Math.max(diagScore, upScore, leftScore)
    }
  }

  let bestJ = 0
  let bestScore = dp[n]![0]!
  for (let j = 1; j <= m; j++) {
    if (dp[n]![j]! >= bestScore) {
      bestScore = dp[n]![j]!
      bestJ = j
    }
  }

  // Backtrack to count matches and find last matched position
  let i = n, j = bestJ
  let lastMatchedArrayIdx = -1
  let matchCount = 0

  while (i > 0 && j > 0) {
    const isMatch = wordsSimilar(spoken[i - 1]!, scriptWindow[j - 1]!.text)
    const diagScore = dp[i - 1]![j - 1]! + (isMatch ? MATCH_SCORE : MISMATCH_PENALTY)

    if (dp[i]![j] === diagScore) {
      if (isMatch) {
        if (lastMatchedArrayIdx < 0) lastMatchedArrayIdx = j - 1
        matchCount++
      }
      i--
      j--
    } else if (dp[i]![j] === dp[i - 1]![j]! + GAP_PENALTY) {
      i--
    } else {
      j--
    }
  }

  return { lastMatchedArrayIdx, score: bestScore, matchCount }
}

export const useFuzzyMatch = () => {
  // Configuration - tuned based on reference.js approach
  const MAX_SPOKEN_WORDS = 20     // Max spoken words to consider
  const MAX_PHRASE_LEN = 6        // Max phrase length to try matching
  const WINDOW_BEHIND = 3         // Backtrack allowance
  const WINDOW_AHEAD = 25         // Search ahead window (smaller = fewer false jumps)
  const MAX_JUMP_SINGLE_WORD = 5  // Single word match: max words to jump
  const MIN_LEN_FOR_LONG_JUMP = 2 // Require 2+ words to allow jumps > MAX_JUMP_SINGLE_WORD

  /**
   * Find best match using hybrid approach:
   * 1. Primary: Phrase-based matching on significant words (like reference.js)
   * 2. Fallback: DP alignment for recovery when phrase matching fails
   *
   * This combines the precision of phrase matching with the flexibility of DP.
   *
   * @param spokenWords - All accumulated words spoken
   * @param scriptWords - Full script words array
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

    // Rule 1: Single word - only match if it exactly equals the next expected word
    if (spokenWords.length === 1) {
      if (nextWord && wordsExactMatch(spokenWords[0]!, nextWord.text)) {
        return { index: nextExpectedIndex, word: nextWord.text }
      }
      return null
    }

    // Rule 2: Two words - require exact match for stability
    if (spokenWords.length === 2) {
      if (nextWord && wordsExactMatch(spokenWords[1]!, nextWord.text)) {
        return { index: nextExpectedIndex, word: nextWord.text }
      }
      const wordAfterNext = scriptWords.find(w => w.id === nextExpectedIndex + 1)
      if (nextWord && wordAfterNext) {
        if (wordsExactMatch(spokenWords[0]!, nextWord.text) &&
          wordsExactMatch(spokenWords[1]!, wordAfterNext.text)) {
          return { index: nextExpectedIndex + 1, word: wordAfterNext.text }
        }
      }
      return null
    }

    // Rule 3: 3+ words - use hybrid phrase matching + DP fallback
    const limitedSpokenWords = spokenWords.length > MAX_SPOKEN_WORDS
      ? spokenWords.slice(-MAX_SPOKEN_WORDS)
      : spokenWords

    // Filter to significant words for phrase matching
    const spokenSignificant = filterSignificant(limitedSpokenWords)
    if (spokenSignificant.length === 0) {
      // All stop words - try exact match on last word
      if (nextWord && wordsExactMatch(limitedSpokenWords[limitedSpokenWords.length - 1]!, nextWord.text)) {
        return { index: nextExpectedIndex, word: nextWord.text }
      }
      return null
    }

    // Build significant word index for script (with original IDs)
    const windowStartIdx = Math.max(0, currentIndex - WINDOW_BEHIND + 1)
    const windowEndIdx = Math.min(scriptWords.length, currentIndex + WINDOW_AHEAD + 1)

    const startArrayIdx = scriptWords.findIndex(w => w.id >= windowStartIdx)
    if (startArrayIdx < 0) return null

    let endArrayIdx = scriptWords.findIndex(w => w.id >= windowEndIdx)
    if (endArrayIdx < 0) endArrayIdx = scriptWords.length

    const scriptWindow = scriptWords.slice(startArrayIdx, endArrayIdx)
    if (scriptWindow.length === 0) return null

    // Build significant words list with their original IDs
    const scriptSignificant: { word: string, originalId: number, arrayIdx: number }[] = []
    scriptWindow.forEach((sw, idx) => {
      if (!isStopWord(sw.text)) {
        scriptSignificant.push({
          word: normalizeWord(sw.text),
          originalId: sw.id,
          arrayIdx: idx
        })
      }
    })

    // === PRIMARY: Phrase-based matching on significant words ===
    const phraseLenMax = Math.min(spokenSignificant.length, MAX_PHRASE_LEN)
    let best: { score: number, endId: number, length: number, arrayIdx: number } | null = null

    for (let len = phraseLenMax; len >= 1; len--) {
      // Take last `len` significant words from spoken
      const phrase = spokenSignificant.slice(-len).map(w => normalizeWord(w))

      // Search for this phrase in script significant words
      for (let i = 0; i <= scriptSignificant.length - len; i++) {
        // Check if phrase matches at position i
        let matches = true
        for (let j = 0; j < len; j++) {
          if (scriptSignificant[i + j]!.word !== phrase[j]) {
            matches = false
            break
          }
        }

        if (!matches) continue

        const endItem = scriptSignificant[i + len - 1]!
        const jumpDistance = endItem.originalId - currentIndex

        // Guard: single-word matches can't jump too far
        if (len === 1 && jumpDistance > MAX_JUMP_SINGLE_WORD) continue

        // Guard: require longer phrase for big jumps
        if (jumpDistance > MAX_JUMP_SINGLE_WORD && len < MIN_LEN_FOR_LONG_JUMP) continue

        // Guard: must advance (no backward movement)
        if (endItem.originalId <= currentIndex) continue

        // Score: prefer longer matches, then closer positions
        const score = len * 10 - jumpDistance - (i * 0.001)

        if (!best || score > best.score) {
          best = {
            score,
            endId: endItem.originalId,
            length: len,
            arrayIdx: endItem.arrayIdx
          }
        }
      }

      // Early exit if we found a good multi-word match
      if (best && best.length >= 2) break
    }

    // If phrase matching found a result, return it
    if (best) {
      const matchedWord = scriptWindow[best.arrayIdx]!.text
      return {
        index: best.endId,
        word: matchedWord
      }
    }

    // === FALLBACK: DP alignment for recovery ===
    // Use when phrase matching fails (ASR errors, missing words, etc.)
    const { lastMatchedArrayIdx, score, matchCount } = alignSequencesDP(
      limitedSpokenWords,
      scriptWindow
    )

    if (lastMatchedArrayIdx < 0) return null

    const matchRatio = matchCount / limitedSpokenWords.length
    const avgScorePerWord = score / limitedSpokenWords.length
    const lastMatchedId = scriptWindow[lastMatchedArrayIdx]!.id
    const jumpDistance = lastMatchedId - currentIndex

    // Stricter thresholds for DP fallback to avoid false positives
    const MIN_MATCH_RATIO = 0.5
    const MIN_SCORE_PER_WORD = 1.0

    // Guard: DP single match can't jump too far either
    if (matchCount <= 1 && jumpDistance > MAX_JUMP_SINGLE_WORD) return null

    if (
      lastMatchedId > currentIndex &&
      matchRatio >= MIN_MATCH_RATIO &&
      avgScorePerWord >= MIN_SCORE_PER_WORD
    ) {
      return {
        index: lastMatchedId,
        word: scriptWindow[lastMatchedArrayIdx]!.text
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
