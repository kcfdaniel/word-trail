/**
 * Debug mode composable
 * Enabled via NUXT_PUBLIC_DEBUG_MODE=true env var
 * Only intended for local/dev environments
 */
export const useDebugMode = () => {
  const config = useRuntimeConfig()
  const isDebugEnabled = computed(() => config.public.debugMode === true)
  const showDebugPanel = ref(false)

  const toggleDebugPanel = () => {
    if (isDebugEnabled.value) {
      showDebugPanel.value = !showDebugPanel.value
    }
  }

  return {
    isDebugEnabled,
    showDebugPanel,
    toggleDebugPanel
  }
}
