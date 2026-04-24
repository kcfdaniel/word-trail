import { useStorage } from '@vueuse/core'
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

const SILENT_ERRORS = new Set(['no-speech', 'aborted'])
const FATAL_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'language-not-supported',
  'bad-grammar',
])
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

const SILENCE_RESET_DELAY = 2000
const LANGUAGE_STORAGE_KEY = 'wordtrail-language'
const DEFAULT_LANGUAGE = 'en-US'

let recognition: SpeechRecognition | null = null
let shouldRestart = false
let silenceTimeout: ReturnType<typeof setTimeout> | null = null

const getErrorKey = (code: string) => {
  return KNOWN_ERROR_CODES.has(code) ? code : 'unknown'
}

export const useSpeech = () => {
  const { t, setLocale } = useI18n()

  const isListening = useState('speech:isListening', () => false)
  const isSupported = useState('speech:isSupported', () => false)
  const transcript = useState('speech:transcript', () => '')
  const interimTranscript = useState('speech:interimTranscript', () => '')
  const confidence = useState('speech:confidence', () => 0)
  const errorCode = useState<string | null>('speech:errorCode', () => null)
  const languageStorage = useStorage(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE)

  const error = computed(() => {
    if (!errorCode.value) return null
    return t(`speech.errors.${getErrorKey(errorCode.value)}`)
  })

  const applyLanguage = (lang: string) => {
    if (recognition) recognition.lang = lang
    void setLocale(speechLangToI18nLocale(lang))
  }

  const language = computed({
    get: () => languageStorage.value,
    set: (lang: string) => {
      if (languageStorage.value === lang) return
      languageStorage.value = lang
    },
  })

  const clearSilenceTimeout = () => {
    if (!silenceTimeout) return
    clearTimeout(silenceTimeout)
    silenceTimeout = null
  }

  const startSilenceTimeout = () => {
    clearSilenceTimeout()
    silenceTimeout = setTimeout(() => {
      if (!isListening.value) return
      transcript.value = ''
      interimTranscript.value = ''
    }, SILENCE_RESET_DELAY)
  }

  const initRecognition = () => {
    if (!import.meta.client || recognition) return

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      isSupported.value = false
      errorCode.value = 'not-available'
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
      errorCode.value = null
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
        transcript.value = `${transcript.value} ${final}`.trim()
      }
      interimTranscript.value = interim
      startSilenceTimeout()
    }

    recognition.onerror = (event) => {
      if (SILENT_ERRORS.has(event.error)) return

      errorCode.value = event.error
      if (FATAL_ERRORS.has(event.error)) {
        shouldRestart = false
      }
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
      if (!shouldRestart || !recognition) return

      setTimeout(() => {
        if (shouldRestart && recognition) {
          recognition.start()
        }
      }, 100)
    }
  }

  const start = () => {
    initRecognition()
    if (!recognition || !isSupported.value) return

    shouldRestart = true
    errorCode.value = null
    recognition.lang = language.value

    try {
      recognition.start()
    }
    catch (e) {
      if ((e as Error).message?.includes('already started')) return
      throw e
    }
  }

  const stop = () => {
    shouldRestart = false
    clearSilenceTimeout()
    if (recognition) recognition.stop()
    isListening.value = false
  }

  const toggle = () => {
    if (isListening.value) stop()
    else start()
  }

  const reset = () => {
    stop()
    transcript.value = ''
    interimTranscript.value = ''
    confidence.value = 0
    errorCode.value = null
  }

  watch(languageStorage, applyLanguage, { immediate: true })

  onMounted(() => {
    initRecognition()
  })

  return {
    isListening: readonly(isListening),
    isSupported: readonly(isSupported),
    transcript: readonly(transcript),
    interimTranscript: readonly(interimTranscript),
    confidence: readonly(confidence),
    error,
    language,
    start,
    stop,
    toggle,
    reset,
  }
}
