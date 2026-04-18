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
  word: string // already normalized
  originalId: number
  arrayIdx: number // index in precomputed.words
}

interface PrecomputedScript {
  words: PrecomputedWord[]
  significant: SignificantWord[]
  // Note: word IDs are sequential 0..n, so ID === array index
}

/**
 * Binary search: find last index where arr[i].key <= target, or -1 if none
 */
const binarySearchLastLE = <T>(arr: T[], target: number, key: (item: T) => number): number => {
  let lo = 0, hi = arr.length - 1, result = -1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (key(arr[mid]!) <= target) {
      result = mid
      lo = mid + 1
    }
    else {
      hi = mid - 1
    }
  }
  return result
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
    }
    else if (/\s/.test(char)) {
      if (currentWord.trim()) {
        results.push(currentWord.trim())
        currentWord = ''
      }
    }
    else {
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
  'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been',
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
  scriptWindow: PrecomputedWord[],
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
    }
    else if (dp[i]![j] === dp[i - 1]![j]! + GAP_PENALTY) {
      i--
    }
    else {
      j--
    }
  }

  return { lastMatchedArrayIdx, score: bestScore, matchCount }
}

interface MatchConfig {
  windowBehind: number
  maxJumpSingleWord: number
  maxJumpSingleOriginal: number
  maxForwardOriginal: number
  minLenForLongJump: number
}

/**
 * Find best phrase match in significant words array
 */
const findPhraseMatch = (
  spokenSignificant: string[],
  scriptSignificant: SignificantWord[],
  searchStart: number,
  searchEnd: number,
  lastSigIdx: number,
  expectedNextOriginal: number,
  maxPhraseLen: number,
  config: MatchConfig,
): { endId: number, length: number } | null => {
  const phraseLenMax = Math.min(spokenSignificant.length, maxPhraseLen)
  let best: { score: number, endId: number, length: number } | null = null

  for (let len = phraseLenMax; len >= 1; len--) {
    const phrase = spokenSignificant.slice(-len)

    for (let i = searchStart; i <= searchEnd - len; i++) {
      // Check if phrase matches at position i
      let matches = true
      for (let j = 0; j < len; j++) {
        if (scriptSignificant[i + j]!.word !== phrase[j]) {
          matches = false
          break
        }
      }
      if (!matches) continue

      const startItem = scriptSignificant[i]!
      const endItem = scriptSignificant[i + len - 1]!

      const forwardSigDelta = i - (lastSigIdx + 1)
      const forwardOrigDelta = startItem.originalId - expectedNextOriginal

      // Guards
      if (forwardSigDelta < -config.windowBehind) continue
      if (len === 1 && (forwardSigDelta > config.maxJumpSingleWord || forwardOrigDelta > config.maxJumpSingleOriginal)) continue
      if (forwardOrigDelta > config.maxForwardOriginal && len < config.minLenForLongJump) continue

      // Score: prefer longer matches, then closer to expected position
      const distance = Math.abs(forwardOrigDelta)
      const score = len * 10 - distance - (i * 0.001)

      if (!best || score > best.score) {
        best = { score, endId: endItem.originalId, length: len }
      }
    }

    // Early exit if we found a good multi-word match
    if (best && best.length >= 2) break
  }

  return best
}

/**
 * Pre-compute script data for efficient matching
 * Call this once when script changes, not on every match attempt
 */
const precomputeScript = (scriptWords: { id: number, text: string }[]): PrecomputedScript => {
  const words: PrecomputedWord[] = []
  const significant: SignificantWord[] = []

  scriptWords.forEach((sw, idx) => {
    const normalized = normalizeWord(sw.text)
    words.push({
      id: sw.id, // Note: id === idx for sequential IDs
      text: sw.text,
      normalized,
    })

    if (!isStopWordNormalized(normalized)) {
      significant.push({
        word: normalized,
        originalId: sw.id,
        arrayIdx: idx,
      })
    }
  })

  return { words, significant }
}

export const useSpeechMatch = () => {
  // Configuration - matching reference.js
  const MAX_SPOKEN_WORDS = 20
  const MAX_PHRASE_LEN = 5
  const WINDOW_BEHIND = 2
  const WINDOW_AHEAD = 15
  const MAX_JUMP_SINGLE_WORD = 5
  const MIN_LEN_FOR_LONG_JUMP = 2
  const MAX_FORWARD_ORIGINAL = 20 // original 14
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
      currentIndex: number,
    ): MatchResult | null => {
      if (spokenWords.length === 0 || precomputed.words.length === 0) return null

      // Pre-normalize spoken words once for this call
      const spokenNormalized = spokenWords.map(w => normalizeWord(w))

      // Since IDs are sequential 0..n, ID === array index
      const nextIdx = currentIndex + 1
      const nextWord = precomputed.words[nextIdx]

      // Rule 1: Single word - only match if it exactly equals the next expected word
      if (spokenWords.length === 1) {
        if (nextWord && spokenNormalized[0] === nextWord.normalized) {
          return { index: nextIdx, word: nextWord.text }
        }
        return null
      }

      // Rule 2: Two words - require exact match for stability
      if (spokenWords.length === 2) {
        if (nextWord && spokenNormalized[1] === nextWord.normalized) {
          return { index: nextIdx, word: nextWord.text }
        }
        const wordAfterNext = precomputed.words[nextIdx + 1]
        if (nextWord && wordAfterNext) {
          if (spokenNormalized[0] === nextWord.normalized
            && spokenNormalized[1] === wordAfterNext.normalized) {
            return { index: nextIdx + 1, word: wordAfterNext.text }
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
        if (nextWord && limitedSpokenNormalized[limitedSpokenNormalized.length - 1] === nextWord.normalized) {
          return { index: nextIdx, word: nextWord.text }
        }
        return null
      }

      // Use pre-computed significant word index
      const allScriptSignificant = precomputed.significant

      if (allScriptSignificant.length === 0) return null

      // Find the last matched significant word index using binary search
      const lastSigIdx = currentIndex >= 0
        ? binarySearchLastLE(allScriptSignificant, currentIndex, w => w.originalId)
        : -1

      // Calculate expected next position in original word space
      const lastOriginal = lastSigIdx >= 0 ? allScriptSignificant[lastSigIdx]!.originalId : -1
      const expectedNextOriginal = lastOriginal + 1

      // Define search bounds in significant-word index space
      const searchStartSig = Math.max(0, lastSigIdx + 1 - WINDOW_BEHIND)
      const searchEndSig = Math.min(allScriptSignificant.length, lastSigIdx + 1 + WINDOW_AHEAD)

      // === PRIMARY: Phrase-based matching on significant words ===
      const matchConfig: MatchConfig = {
        windowBehind: WINDOW_BEHIND,
        maxJumpSingleWord: MAX_JUMP_SINGLE_WORD,
        maxJumpSingleOriginal: MAX_JUMP_SINGLE_ORIGINAL,
        maxForwardOriginal: MAX_FORWARD_ORIGINAL,
        minLenForLongJump: MIN_LEN_FOR_LONG_JUMP,
      }

      const best = findPhraseMatch(
        spokenSignificant,
        allScriptSignificant,
        searchStartSig,
        searchEndSig,
        lastSigIdx,
        expectedNextOriginal,
        MAX_PHRASE_LEN,
        matchConfig,
      )

      // If phrase matching found a result, return it
      if (best) {
        const matchedWord = precomputed.words[best.endId]
        return {
          index: best.endId,
          word: matchedWord?.text ?? '',
        }
      }

      // === FALLBACK: DP alignment for recovery ===
      // Since IDs are sequential, ID === array index, so we can use direct bounds
      const startArrayIdx = Math.max(0, currentIndex - WINDOW_BEHIND + 1)
      const endArrayIdx = Math.min(precomputed.words.length, currentIndex + MAX_FORWARD_ORIGINAL + 1)

      const scriptWindow = precomputed.words.slice(startArrayIdx, endArrayIdx)
      if (scriptWindow.length === 0) return null

      const { lastMatchedArrayIdx, score, matchCount } = alignSequencesDP(
        limitedSpokenNormalized,
        scriptWindow,
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
        lastMatchedId > currentIndex
        && matchRatio >= MIN_MATCH_RATIO
        && avgScorePerWord >= MIN_SCORE_PER_WORD
      ) {
        return {
          index: lastMatchedId,
          word: scriptWindow[lastMatchedArrayIdx]!.text,
        }
      }

      return null
    }

    return { findBestMatch }
  }

  return {
    createMatcher,
    normalizeWord,
    splitWords,
  }
}
