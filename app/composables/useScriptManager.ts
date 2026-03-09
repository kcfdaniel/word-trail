export interface Script {
  id: string
  title: string
  content: string // Plain text content (legacy/fallback)
  contentHtml?: string // Rich text HTML content
  isRichText?: boolean // Flag to indicate rich text mode
  createdAt: number
  updatedAt: number
}

export interface ScriptWord {
  id: number
  text: string
  state: 'pending' | 'completed' | 'active'
}

const STORAGE_KEY = 'wordtrail-scripts'
const CURRENT_SCRIPT_KEY = 'wordtrail-current-script'

export const useScriptManager = () => {
  const scripts = ref<Script[]>([])
  const currentScript = ref<Script | null>(null)
  const scriptWords = ref<ScriptWord[]>([])
  const currentIndex = ref(-1)
  const isLoaded = ref(false)

  const loadScripts = () => {
    if (!import.meta.client) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        scripts.value = JSON.parse(stored)
      }

      const currentId = localStorage.getItem(CURRENT_SCRIPT_KEY)
      if (currentId) {
        const found = scripts.value.find(s => s.id === currentId)
        if (found) {
          setCurrentScript(found)
        }
      }
    } catch (e) {
      console.error('Failed to load scripts:', e)
    }

    isLoaded.value = true
  }

  const saveScripts = () => {
    if (!import.meta.client) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts.value))
    } catch (e) {
      console.error('Failed to save scripts:', e)
    }
  }

  const parseContent = (content: string): ScriptWord[] => {
    const CJK_RANGE = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/
    // Chinese/CJK punctuation ranges
    const CJK_PUNCTUATION = /[\u3000-\u303f\uff00-\uffef\u2000-\u206f]/
    const results: string[] = []
    let currentWord = ''

    for (let i = 0; i < content.length; i++) {
      const char = content[i]!
      if (CJK_RANGE.test(char)) {
        // CJK character - flush current word, start new CJK word
        if (currentWord.trim()) {
          results.push(currentWord.trim())
          currentWord = ''
        }
        // Start with CJK char, then collect any trailing CJK punctuation
        let cjkWord = char
        while (i + 1 < content.length && CJK_PUNCTUATION.test(content[i + 1]!)) {
          i++
          cjkWord += content[i]
        }
        results.push(cjkWord)
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

    // Keep all segments including punctuation for display
    return results.map((text, index) => ({
      id: index,
      text,
      state: 'pending' as const
    }))
  }

  const setCurrentScript = (script: Script | null) => {
    currentScript.value = script
    if (script) {
      scriptWords.value = parseContent(script.content)
      currentIndex.value = -1
      if (import.meta.client) {
        localStorage.setItem(CURRENT_SCRIPT_KEY, script.id)
      }
    } else {
      scriptWords.value = []
      currentIndex.value = -1
      if (import.meta.client) {
        localStorage.removeItem(CURRENT_SCRIPT_KEY)
      }
    }
  }

  const createScript = (title: string, content: string, options?: { contentHtml?: string, isRichText?: boolean }): Script => {
    const script: Script = {
      id: crypto.randomUUID(),
      title: title || 'Untitled Script',
      content,
      contentHtml: options?.contentHtml,
      isRichText: options?.isRichText ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    scripts.value.unshift(script)
    saveScripts()
    setCurrentScript(script)

    return script
  }

  const updateScript = (id: string, updates: Partial<Pick<Script, 'title' | 'content' | 'contentHtml' | 'isRichText'>>) => {
    const index = scripts.value.findIndex(s => s.id === id)
    if (index === -1) return

    const existing = scripts.value[index]
    if (!existing) return

    const updated: Script = {
      id: existing.id,
      title: updates.title ?? existing.title,
      content: updates.content ?? existing.content,
      contentHtml: updates.contentHtml ?? existing.contentHtml,
      isRichText: updates.isRichText ?? existing.isRichText,
      createdAt: existing.createdAt,
      updatedAt: Date.now()
    }

    scripts.value[index] = updated
    saveScripts()

    if (currentScript.value?.id === id) {
      setCurrentScript(updated)
    }
  }

  const deleteScript = (id: string) => {
    const index = scripts.value.findIndex(s => s.id === id)
    if (index === -1) return

    scripts.value.splice(index, 1)
    saveScripts()

    if (currentScript.value?.id === id) {
      setCurrentScript(scripts.value[0] ?? null)
    }
  }

  /**
   * Move to a specific position in the script
   * Marks all words before as completed, target as active
   */
  const moveTo = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= scriptWords.value.length) return

    // Update word states
    for (let i = 0; i < scriptWords.value.length; i++) {
      const word = scriptWords.value[i]
      if (!word) continue

      if (i < targetIndex) {
        word.state = 'completed'
      } else if (i === targetIndex) {
        word.state = 'active'
      } else {
        word.state = 'pending'
      }
    }

    currentIndex.value = targetIndex
  }

  /**
   * Handle a match result - advance to the matched position
   */
  const handleMatch = (matchIndex: number) => {
    // Only move forward or allow small rewinds
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

  const resetProgress = () => {
    scriptWords.value.forEach((word) => {
      word.state = 'pending'
    })
    currentIndex.value = -1
  }

  const getProgress = computed(() => {
    if (scriptWords.value.length === 0) return 0
    const completed = scriptWords.value.filter(
      w => w.state === 'completed' || w.state === 'active'
    ).length
    return Math.round((completed / scriptWords.value.length) * 100)
  })

  const activeWordIndex = computed(() => {
    return scriptWords.value.findIndex(w => w.state === 'active')
  })

  onMounted(() => {
    loadScripts()
  })

  const getScriptById = (id: string): Script | null => {
    return scripts.value.find(s => s.id === id) ?? null
  }

  const loadScriptById = (id: string): boolean => {
    const script = getScriptById(id)
    if (script) {
      setCurrentScript(script)
      return true
    }
    return false
  }

  return {
    scripts: readonly(scripts),
    currentScript: readonly(currentScript),
    scriptWords,
    currentIndex: readonly(currentIndex),
    isLoaded: readonly(isLoaded),
    getProgress,
    activeWordIndex,
    // Functions
    loadScripts,
    setCurrentScript,
    getScriptById,
    loadScriptById,
    createScript,
    updateScript,
    deleteScript,
    moveTo,
    handleMatch,
    setPositionAt,
    resetProgress
  }
}
