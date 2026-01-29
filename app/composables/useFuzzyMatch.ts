export interface MatchResult {
  index: number
  word: string
}

/**
 * Pre-computed script data for O(1) lookups
 */
interface PrecomputedWord {
  id: number
  text: string
  normalized: string
}

interface SignificantWord {
  word: string      // already normalized
  originalId: number
  arrayIdx: number  // index in precomputed.words
}

interface PrecomputedScript {
  words: PrecomputedWord[]
  significant: SignificantWord[]
  idToArrayIdx: Map<number, number>  // word.id → index in words array
}

/**
 * Normalize word for comparison
 * Removes punctuation, dashes, and converts to lowercase
 */
const normalizeWord = (word: string): string => {
  return word
    .toLowerCase()
    .replace(/[\u00AD\u2010-\u2015\u2212]/g, '') // soft hyphens, dashes
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/gu, '') // keep letters, numbers, CJK
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
      if (currentWord.trim()) {
        results.push(currentWord.trim())
        currentWord = ''
      }
      results.push(char)
    } else if (/\s/.test(char)) {
      if (currentWord.trim()) {
        results.push(currentWord.trim())
        currentWord = ''
      }
    } else {
      currentWord += char
    }
  }

  if (currentWord.trim()) {
    results.push(currentWord.trim())
  }

  return results
}

/**
 * Common stop words (already lowercase/normalized)
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in',
  'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been'
])

/**
 * Check if a normalized word is a stop word
 * For use with already-normalized strings (avoids redundant normalization)
 */
const isStopWordNormalized = (normalizedWord: string): boolean => {
  // CJK characters are never stop words
  if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(normalizedWord)) {
    return false
  }
  return STOP_WORDS.has(normalizedWord)
}

/**
 * Check if a word is a stop word (normalizes first)
 */
const isStopWord = (word: string): boolean => {
  return isStopWordNormalized(normalizeWord(word))
}

/**
 * Check if two normalized words are similar enough to be considered a match
 */
const wordsSimilarNormalized = (a: string, b: string): boolean => {
  if (a === b) return true
  if (a.length === 0 || b.length === 0) return false

  // For very short words (1-2 chars), require exact match
  if (a.length <= 2 || b.length <= 2) return a === b

  // Check if one is prefix of other
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
 * Check if two words are similar (normalizes both)
 */
const wordsSimilar = (spoken: string, script: string): boolean => {
  return wordsSimilarNormalized(normalizeWord(spoken), normalizeWord(script))
}

/**
 * Check if two words are exactly the same (after normalization)
 */
const wordsExactMatch = (spoken: string, script: string): boolean => {
  return normalizeWord(spoken) === normalizeWord(script)
}

/**
 * Check if two normalized words are exactly the same
 */
const wordsExactMatchNormalized = (a: string, b: string): boolean => {
  return a === b
}

/**
 * Windowed DP alignment for recovery scenarios
 * Uses pre-normalized words for efficiency
 */
interface AlignmentResult {
  lastMatchedArrayIdx: number
  score: number
  matchCount: number
}

const alignSequencesDP = (
  spokenNormalized: string[],
  scriptWindow: PrecomputedWord[]
): AlignmentResult => {
  const n = spokenNormalized.length
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
      const isMatch = wordsSimilarNormalized(spokenNormalized[i - 1]!, scriptWindow[j - 1]!.normalized)
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
    const isMatch = wordsSimilarNormalized(spokenNormalized[i - 1]!, scriptWindow[j - 1]!.normalized)
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

/**
 * Pre-compute script data for efficient matching
 * Call this once when script changes, not on every match attempt
 */
const precomputeScript = (scriptWords: { id: number, text: string }[]): PrecomputedScript => {
  const words: PrecomputedWord[] = []
  const significant: SignificantWord[] = []
  const idToArrayIdx = new Map<number, number>()

  scriptWords.forEach((sw, idx) => {
    const normalized = normalizeWord(sw.text)
    const word: PrecomputedWord = {
      id: sw.id,
      text: sw.text,
      normalized
    }
    words.push(word)
    idToArrayIdx.set(sw.id, idx)

    if (!isStopWordNormalized(normalized)) {
      significant.push({
        word: normalized,
        originalId: sw.id,
        arrayIdx: idx
      })
    }
  })

  return { words, significant, idToArrayIdx }
}

export const useFuzzyMatch = () => {
  // Configuration - matching reference.js
  const MAX_SPOKEN_WORDS = 20
  const MAX_PHRASE_LEN = 5
  const WINDOW_BEHIND = 2
  const WINDOW_AHEAD = 15
  const MAX_JUMP_SINGLE_WORD = 5
  const MIN_LEN_FOR_LONG_JUMP = 2
  const MAX_FORWARD_ORIGINAL = 14
  const MAX_JUMP_SINGLE_ORIGINAL = 6

  /**
   * Create an optimized matcher for a specific script
   * Pre-computes data structures once, reuses them for all match attempts
   */
  const createMatcher = (scriptWords: { id: number, text: string }[]) => {
    // Pre-compute once when script changes
    const precomputed = precomputeScript(scriptWords)

    /**
     * Find best match using hybrid approach:
     * 1. Primary: Phrase-based matching on significant words
     * 2. Fallback: DP alignment for recovery when phrase matching fails
     */
    const findBestMatch = (
      spokenWords: string[],
      currentIndex: number
    ): MatchResult | null => {
      if (spokenWords.length === 0 || precomputed.words.length === 0) return null

      // Pre-normalize spoken words once for this call
      const spokenNormalized = spokenWords.map(w => normalizeWord(w))

      const nextExpectedIndex = currentIndex + 1
      const nextWordIdx = precomputed.idToArrayIdx.get(nextExpectedIndex)
      const nextWord = nextWordIdx !== undefined ? precomputed.words[nextWordIdx] : undefined

      // Rule 1: Single word - only match if it exactly equals the next expected word
      if (spokenWords.length === 1) {
        if (nextWord && wordsExactMatchNormalized(spokenNormalized[0]!, nextWord.normalized)) {
          return { index: nextExpectedIndex, word: nextWord.text }
        }
        return null
      }

      // Rule 2: Two words - require exact match for stability
      if (spokenWords.length === 2) {
        if (nextWord && wordsExactMatchNormalized(spokenNormalized[1]!, nextWord.normalized)) {
          return { index: nextExpectedIndex, word: nextWord.text }
        }
        const wordAfterNextIdx = precomputed.idToArrayIdx.get(nextExpectedIndex + 1)
        const wordAfterNext = wordAfterNextIdx !== undefined ? precomputed.words[wordAfterNextIdx] : undefined
        if (nextWord && wordAfterNext) {
          if (wordsExactMatchNormalized(spokenNormalized[0]!, nextWord.normalized) &&
            wordsExactMatchNormalized(spokenNormalized[1]!, wordAfterNext.normalized)) {
            return { index: nextExpectedIndex + 1, word: wordAfterNext.text }
          }
        }
        return null
      }

      // Rule 3: 3+ words - use hybrid phrase matching + DP fallback
      const limitedSpokenNormalized = spokenNormalized.length > MAX_SPOKEN_WORDS
        ? spokenNormalized.slice(-MAX_SPOKEN_WORDS)
        : spokenNormalized

      // Filter to significant words (already normalized)
      const spokenSignificant = limitedSpokenNormalized.filter(w => !isStopWordNormalized(w))
      if (spokenSignificant.length === 0) {
        // All stop words - try exact match on last word
        if (nextWord && wordsExactMatchNormalized(limitedSpokenNormalized[limitedSpokenNormalized.length - 1]!, nextWord.normalized)) {
          return { index: nextExpectedIndex, word: nextWord.text }
        }
        return null
      }

      // Use pre-computed significant word index
      const allScriptSignificant = precomputed.significant

      if (allScriptSignificant.length === 0) return null

      // Find the last matched significant word index
      let lastSigIdx = -1
      if (currentIndex >= 0) {
        for (let i = allScriptSignificant.length - 1; i >= 0; i--) {
          if (allScriptSignificant[i]!.originalId <= currentIndex) {
            lastSigIdx = i
            break
          }
        }
      }

      // Calculate expected next position in original word space
      const lastOriginal = lastSigIdx >= 0 ? allScriptSignificant[lastSigIdx]!.originalId : -1
      const expectedNextOriginal = lastOriginal + 1

      // Define search bounds in significant-word index space
      const searchStartSig = Math.max(0, lastSigIdx + 1 - WINDOW_BEHIND)
      const searchEndSig = Math.min(allScriptSignificant.length, lastSigIdx + 1 + WINDOW_AHEAD)

      // === PRIMARY: Phrase-based matching on significant words ===
      const phraseLenMax = Math.min(spokenSignificant.length, MAX_PHRASE_LEN)
      let best: { score: number, endId: number, length: number } | null = null

      for (let len = phraseLenMax; len >= 1; len--) {
        // Take last `len` significant words from spoken (already normalized)
        const phrase = spokenSignificant.slice(-len)

        // Search within bounded range
        for (let i = searchStartSig; i <= searchEndSig - len; i++) {
          // Check if phrase matches at position i
          let matches = true
          for (let j = 0; j < len; j++) {
            if (allScriptSignificant[i + j]!.word !== phrase[j]) {
              matches = false
              break
            }
          }

          if (!matches) continue

          const startItem = allScriptSignificant[i]!
          const endItem = allScriptSignificant[i + len - 1]!

          // Calculate deltas
          const forwardSigDelta = i - (lastSigIdx + 1)
          const forwardOrigDelta = startItem.originalId - expectedNextOriginal

          // Guard: prevent large backwards jumps
          if (forwardSigDelta < -WINDOW_BEHIND) continue

          // Guard: single-word matches can't jump too far
          if (len === 1 && (forwardSigDelta > MAX_JUMP_SINGLE_WORD || forwardOrigDelta > MAX_JUMP_SINGLE_ORIGINAL)) continue

          // Guard: require longer phrase for big jumps
          if (forwardOrigDelta > MAX_FORWARD_ORIGINAL && len < MIN_LEN_FOR_LONG_JUMP) continue

          // Score: prefer longer matches, then closer to expected position
          const distance = Math.abs(forwardOrigDelta)
          const score = len * 10 - distance - (i * 0.001)

          if (!best || score > best.score) {
            best = {
              score,
              endId: endItem.originalId,
              length: len
            }
          }
        }

        // Early exit if we found a good multi-word match
        if (best && best.length >= 2) break
      }

      // If phrase matching found a result, return it
      if (best) {
        const matchedWordIdx = precomputed.idToArrayIdx.get(best.endId)
        const matchedWord = matchedWordIdx !== undefined ? precomputed.words[matchedWordIdx]!.text : ''
        return {
          index: best.endId,
          word: matchedWord
        }
      }

      // === FALLBACK: DP alignment for recovery ===
      const windowStartIdx = Math.max(0, currentIndex - WINDOW_BEHIND + 1)
      const windowEndIdx = Math.min(precomputed.words.length, currentIndex + MAX_FORWARD_ORIGINAL + 1)

      // Find array indices for window bounds (O(1) would require sorted search, but window is small)
      let startArrayIdx = 0
      for (let i = 0; i < precomputed.words.length; i++) {
        if (precomputed.words[i]!.id >= windowStartIdx) {
          startArrayIdx = i
          break
        }
      }

      let endArrayIdx = precomputed.words.length
      for (let i = startArrayIdx; i < precomputed.words.length; i++) {
        if (precomputed.words[i]!.id >= windowEndIdx) {
          endArrayIdx = i
          break
        }
      }

      const scriptWindow = precomputed.words.slice(startArrayIdx, endArrayIdx)
      if (scriptWindow.length === 0) return null

      const { lastMatchedArrayIdx, score, matchCount } = alignSequencesDP(
        limitedSpokenNormalized,
        scriptWindow
      )

      if (lastMatchedArrayIdx < 0) return null

      const matchRatio = matchCount / limitedSpokenNormalized.length
      const avgScorePerWord = score / limitedSpokenNormalized.length
      const lastMatchedId = scriptWindow[lastMatchedArrayIdx]!.id
      const jumpDistance = lastMatchedId - currentIndex

      const MIN_MATCH_RATIO = 0.5
      const MIN_SCORE_PER_WORD = 1.0

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

    return { findBestMatch }
  }

  // Legacy API for backwards compatibility
  const findBestMatch = (
    spokenWords: string[],
    scriptWords: { id: number, text: string }[],
    currentIndex: number
  ): MatchResult | null => {
    const matcher = createMatcher(scriptWords)
    return matcher.findBestMatch(spokenWords, currentIndex)
  }

  return {
    createMatcher,
    findBestMatch,
    wordsSimilar,
    wordsExactMatch,
    normalizeWord,
    splitWords
  }
}
