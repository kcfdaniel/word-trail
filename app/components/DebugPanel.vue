<script setup lang="ts">
import type { MatchResult } from '~/composables/useSpeechMatch'

const props = defineProps<{
  transcript: string
  interimTranscript: string
  isListening: boolean
  currentIndex: number
  lastMatch: MatchResult | null
  wordsCount: number
  progress: number
  sequenceLength: number
}>()

const timestamp = ref('')
const matchLog = ref<Array<{ time: string, info: MatchResult }>>([])

// Update timestamp every 100ms
let interval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  interval = setInterval(() => {
    timestamp.value = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }, 100)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

// Log matches
watch(() => props.lastMatch, (match) => {
  if (match) {
    matchLog.value.unshift({
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      info: match
    })
    // Keep only last 60 matches
    if (matchLog.value.length > 60) {
      matchLog.value = matchLog.value.slice(0, 60)
    }
  }
}, { deep: true })

const combinedTranscript = computed(() => {
  const final = props.transcript || ''
  const interim = props.interimTranscript || ''
  return { final, interim }
})
</script>

<template>
  <div class="debug-panel">
    <div class="debug-header">
      <div class="debug-title">
        <span class="debug-icon">&#9654;</span>
        WORDTRAIL DEBUG
      </div>
      <div class="debug-status">
        <span
          class="status-dot"
          :class="{ 'status-dot--active': isListening }"
        />
        {{ isListening ? 'LISTENING' : 'PAUSED' }}
        <span class="timestamp">{{ timestamp }}</span>
      </div>
    </div>

    <div class="debug-content">
      <!-- Transcript Section -->
      <div class="debug-section">
        <div class="section-header">
          <span class="section-label">TRANSCRIPT</span>
          <span class="section-badge">LIVE</span>
        </div>
        <div class="transcript-box">
          <span class="transcript-final">{{ combinedTranscript.final }}</span>
          <span
            v-if="combinedTranscript.interim"
            class="transcript-interim"
          >{{ combinedTranscript.interim }}</span>
          <span
            v-if="!combinedTranscript.final && !combinedTranscript.interim"
            class="transcript-empty"
          >// waiting for speech input...</span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="debug-section">
        <div class="section-header">
          <span class="section-label">POSITION</span>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">CURRENT</span>
            <span class="stat-value stat-value--cyan">{{ currentIndex }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">SEQUENCE</span>
            <span class="stat-value stat-value--yellow">{{ sequenceLength }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">PROGRESS</span>
            <span class="stat-value stat-value--magenta">{{ progress }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">TOTAL</span>
            <span class="stat-value">{{ wordsCount }}</span>
          </div>
        </div>
      </div>

      <!-- Match Log -->
      <div class="debug-section debug-section--grow">
        <div class="section-header">
          <span class="section-label">MATCH LOG</span>
          <span class="section-count">{{ matchLog.length }}</span>
        </div>
        <div class="match-log">
          <div
            v-for="(entry, i) in matchLog"
            :key="i"
            class="log-entry"
          >
            <span class="log-time">{{ entry.time }}</span>
            <span class="log-word">"{{ entry.info.word }}"</span>
            <span class="log-stats">idx:{{ entry.info.index }}</span>
          </div>
          <div
            v-if="matchLog.length === 0"
            class="log-empty"
          >
            // no matches yet
          </div>
        </div>
      </div>
    </div>

    <div class="debug-footer">
      <span class="footer-hint">ENV: NUXT_PUBLIC_DEBUG_MODE=true</span>
    </div>
  </div>
</template>

<style scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0d1117;
  color: #c9d1d9;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  font-size: 0.75rem;
  border-left: 1px solid #30363d;
  overflow: hidden;
}

.debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  background: linear-gradient(180deg, #161b22 0%, #0d1117 100%);
  border-bottom: 1px solid #30363d;
}

.debug-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  color: #58a6ff;
}

.debug-icon {
  font-size: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.debug-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.625rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #484f58;
}

.status-dot--active {
  background: #3fb950;
  box-shadow: 0 0 8px #3fb950;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timestamp {
  color: #6e7681;
  font-variant-numeric: tabular-nums;
}

.debug-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  gap: 0.75rem;
  overflow-y: auto;
}

.debug-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.debug-section--grow {
  flex: 1;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #8b949e;
}

.section-badge {
  font-size: 0.5rem;
  padding: 0.125rem 0.375rem;
  background: #238636;
  color: #fff;
  border-radius: 2px;
  letter-spacing: 0.05em;
  animation: pulse 2s ease-in-out infinite;
}

.section-count {
  font-size: 0.625rem;
  color: #6e7681;
}

.transcript-box {
  padding: 0.75rem;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 4px;
  min-height: 60px;
  max-height: 100px;
  overflow-y: auto;
  line-height: 1.6;
  word-wrap: break-word;
}

.transcript-final {
  color: #c9d1d9;
}

.transcript-interim {
  color: #58a6ff;
  opacity: 0.7;
  font-style: italic;
}

.transcript-empty {
  color: #484f58;
  font-style: italic;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 4px;
}

.stat-label {
  font-size: 0.5625rem;
  color: #6e7681;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-value--cyan { color: #56d4dd; }
.stat-value--magenta { color: #db61a2; }
.stat-value--yellow { color: #e3b341; }

.match-log {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 4px;
  overflow-y: auto;
  min-height: 80px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background: #0d1117;
  border-radius: 2px;
  border-left: 2px solid #3fb950;
  font-size: 0.6875rem;
}

.log-time {
  color: #6e7681;
  font-variant-numeric: tabular-nums;
}

.log-word {
  color: #f0883e;
  flex-shrink: 0;
}

.log-stats {
  color: #6e7681;
  font-size: 0.625rem;
  margin-left: auto;
  white-space: nowrap;
}

.log-empty {
  color: #484f58;
  font-style: italic;
  padding: 0.5rem;
}

.debug-footer {
  padding: 0.5rem 0.875rem;
  background: #161b22;
  border-top: 1px solid #30363d;
}

.footer-hint {
  font-size: 0.5625rem;
  color: #484f58;
  letter-spacing: 0.02em;
}

/* Scrollbar styling */
.debug-panel ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.debug-panel ::-webkit-scrollbar-track {
  background: #0d1117;
}

.debug-panel ::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.debug-panel ::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>
