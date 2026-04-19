import { speechLangToI18nLocale } from '~/utils/languageMapping'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export interface SpeechResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

// Errors we treat as transient and should silently recover from.
// See https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error
const SILENT_ERRORS = new Set(['no-speech', 'aborted'])

// Errors that indicate a misconfiguration the user must fix — stop retrying
// so we don't loop on a permission denial or an unsupported language.
const FATAL_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'language-not-supported',
  'bad-grammar',
])

// Error codes we have dedicated translations for. Anything outside this
// set falls through to `speech.errors.unknown`.
const KNOWN_ERROR_CODES = new Set([
  'no-speech',
  'aborted',
  'audio-capture',
  'network',
  'not-allowed',
  'service-not-allowed',
  'bad-grammar',
  'language-not-supported',
  'not-available',
])

export const useSpeech = () => {
  const { t, setLocale } = useI18n()
  const translateError = (code: string): string => {
    const key = KNOWN_ERROR_CODES.has(code) ? code : 'unknown'
    return t(`speech.errors.${key}`)
  }

  const isListening = ref(false)
  const isSupported = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const confidence = ref(0)
  const error = ref<string | null>(null)
  const language = ref('en-US')

  let recognition: SpeechRecognition | null = null
  let shouldRestart = false

  // Silence detection - reset transcript after 2 seconds of no speech
  const SILENCE_RESET_DELAY = 2000
  let silenceTimeout: ReturnType<typeof setTimeout> | null = null

  const clearSilenceTimeout = () => {
    if (silenceTimeout) {
      clearTimeout(silenceTimeout)
      silenceTimeout = null
    }
  }

  const startSilenceTimeout = () => {
    clearSilenceTimeout()
    silenceTimeout = setTimeout(() => {
      // Only reset if still listening (user hasn't stopped)
      if (isListening.value) {
        transcript.value = ''
        interimTranscript.value = ''
      }
    }, SILENCE_RESET_DELAY)
  }

  const initRecognition = () => {
    if (!import.meta.client) return

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      isSupported.value = false
      console.error('not available')
      error.value = translateError('not-available')
      return
    }

    isSupported.value = true
    recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language.value
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isListening.value = true
      error.value = null
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue

        const alternative = result[0]
        if (!alternative) continue

        if (result.isFinal) {
          final += alternative.transcript
          confidence.value = alternative.confidence
        }
        else {
          interim += alternative.transcript
        }
      }

      if (final) {
        transcript.value = (transcript.value + ' ' + final).trim()
      }
      interimTranscript.value = interim

      // Reset silence timer on any speech activity
      startSilenceTimeout()
    }

    recognition.onerror = (event) => {
      if (SILENT_ERRORS.has(event.error)) return
      console.error('recognition error', event)
      error.value = translateError(event.error)

      // Stop auto-restart for errors the user must address (permission, hardware,
      // unsupported language) so we don't loop and keep failing.
      if (FATAL_ERRORS.has(event.error)) {
        shouldRestart = false
      }
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
      if (shouldRestart) {
        setTimeout(() => {
          if (shouldRestart && recognition) {
            recognition.start()
          }
        }, 100)
      }
    }
  }

  const start = () => {
    if (!recognition) {
      initRecognition()
    }
    if (!recognition || !isSupported.value) return

    shouldRestart = true
    error.value = null
    recognition.lang = language.value

    try {
      recognition.start()
    }
    catch (e) {
      if ((e as Error).message?.includes('already started')) {
        return
      }
      throw e
    }
  }

  const stop = () => {
    shouldRestart = false
    clearSilenceTimeout()
    if (recognition) {
      recognition.stop()
    }
    isListening.value = false
  }

  const toggle = () => {
    if (isListening.value) {
      stop()
    }
    else {
      start()
    }
  }

  const reset = () => {
    stop()
    transcript.value = ''
    interimTranscript.value = ''
    confidence.value = 0
    error.value = null
  }

  const setLanguage = (lang: string) => {
    language.value = lang
    if (recognition) {
      recognition.lang = lang
    }
    // Keep the app's UI locale in lockstep with the speech-recognition language.
    const i18nLocale = speechLangToI18nLocale(lang)
    void setLocale(i18nLocale)
  }

  onMounted(() => {
    initRecognition()
  })

  onUnmounted(() => {
    clearSilenceTimeout()
    stop()
  })

  return {
    isListening: readonly(isListening),
    isSupported: readonly(isSupported),
    transcript: readonly(transcript),
    interimTranscript: readonly(interimTranscript),
    confidence: readonly(confidence),
    error: readonly(error),
    language,
    start,
    stop,
    toggle,
    reset,
    setLanguage,
  }
}
