import { useStorage } from '@vueuse/core'
import { randomUUID } from '~/utils/id'
import { plainTextToHtml } from '~/utils/richText'

export interface Script {
  id: string
  title: string
  contentHtml: string
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'wordtrail-scripts'
const CURRENT_SCRIPT_KEY = 'wordtrail-current-script'

// Module-level singletons — shared across every useScriptManager() call,
// so consumers see the same reactive state.
const scripts = useStorage<Script[]>(STORAGE_KEY, [], undefined, {
  deep: true,
  listenToStorageChanges: true,
  writeDefaults: true,
})
const currentScriptId = useStorage<string | null>(CURRENT_SCRIPT_KEY, null, undefined, {
  listenToStorageChanges: true,
  writeDefaults: true,
})
const isLoaded = ref(false)

const normalizeScript = (script: Partial<Script> & { content?: string }): Script => {
  const content = typeof script?.content === 'string' ? script.content : ''
  const contentHtml = typeof script?.contentHtml === 'string'
    ? script.contentHtml
    : plainTextToHtml(content)

  return {
    id: String(script?.id ?? randomUUID()),
    title: typeof script?.title === 'string' ? script.title : 'Untitled Script',
    contentHtml,
    createdAt: typeof script?.createdAt === 'number' ? script.createdAt : Date.now(),
    updatedAt: typeof script?.updatedAt === 'number' ? script.updatedAt : Date.now(),
  }
}

const normalizeStoredScripts = () => {
  const normalized = scripts.value.map(normalizeScript)
  if (JSON.stringify(scripts.value) !== JSON.stringify(normalized)) {
    scripts.value = normalized
  }
  if (currentScriptId.value && !normalized.some(s => s.id === currentScriptId.value)) {
    currentScriptId.value = null
  }
}

export const useScriptManager = () => {
  const currentScript = computed(() => {
    if (!currentScriptId.value) return null
    return scripts.value.find(s => s.id === currentScriptId.value) ?? null
  })

  const setCurrentScript = (script: Script | null) => {
    currentScriptId.value = script?.id ?? null
  }

  const createScript = (title: string, contentHtml: string): Script => {
    const script: Script = {
      id: randomUUID(),
      title: title || 'Untitled Script',
      contentHtml,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    scripts.value.unshift(script)
    setCurrentScript(script)
    return script
  }

  const updateScript = (id: string, updates: Partial<Pick<Script, 'title' | 'contentHtml'>>) => {
    const index = scripts.value.findIndex(s => s.id === id)
    if (index === -1) return

    const existing = scripts.value[index]
    if (!existing) return

    scripts.value[index] = {
      ...existing,
      title: updates.title ?? existing.title,
      contentHtml: updates.contentHtml ?? existing.contentHtml,
      updatedAt: Date.now(),
    }
  }

  const deleteScript = (id: string) => {
    const index = scripts.value.findIndex(s => s.id === id)
    if (index === -1) return

    scripts.value.splice(index, 1)
    if (currentScriptId.value === id) {
      currentScriptId.value = scripts.value[0]?.id ?? null
    }
  }

  onMounted(() => {
    if (isLoaded.value) return
    try {
      normalizeStoredScripts()
    }
    catch (e) {
      console.error('Failed to load scripts:', e)
    }
    isLoaded.value = true
  })

  return {
    scripts: readonly(scripts),
    currentScript,
    isLoaded: readonly(isLoaded),
    setCurrentScript,
    createScript,
    updateScript,
    deleteScript,
  }
}
