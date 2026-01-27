export interface Script {
  id: string
  title: string
  content: string
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
    const words = content
      .split(/\s+/)
      .filter(w => w.trim().length > 0)

    return words.map((text, index) => ({
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

  const createScript = (title: string, content: string): Script => {
    const script: Script = {
      id: crypto.randomUUID(),
      title: title || 'Untitled Script',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    scripts.value.unshift(script)
    saveScripts()
    setCurrentScript(script)

    return script
  }

  const updateScript = (id: string, updates: Partial<Pick<Script, 'title' | 'content'>>) => {
    const index = scripts.value.findIndex(s => s.id === id)
    if (index === -1) return

    const existing = scripts.value[index]
    if (!existing) return

    const updated: Script = {
      id: existing.id,
      title: updates.title ?? existing.title,
      content: updates.content ?? existing.content,
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
    createScript,
    updateScript,
    deleteScript,
    moveTo,
    handleMatch,
    setPositionAt,
    resetProgress
  }
}
