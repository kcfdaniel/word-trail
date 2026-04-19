/**
 * Polyfill `crypto.randomUUID` for browsers running in a non-secure context.
 *
 * iOS Safari (and Chromium on http://) gate `crypto.randomUUID` behind a
 * secure-context check, so accessing the dev server from a phone via a
 * LAN IP (http://192.168.x.x:3000) leaves it undefined. Several third-party
 * runtimes in this project (`@nuxt/a11y`, `@nuxt/hints`, vendor bundles)
 * call it directly and crash before we can do anything.
 *
 * `enforce: 'pre'` + the `00.` filename prefix make this plugin run before
 * every other client plugin in the boot chain, so the polyfill is in place
 * by the time those runtimes initialize.
 */
export default defineNuxtPlugin({
  name: 'crypto-uuid-polyfill',
  enforce: 'pre',
  setup() {
    if (typeof crypto === 'undefined') return
    if (typeof crypto.randomUUID === 'function') return

    const generate = (): `${string}-${string}-${string}-${string}-${string}` => {
      if (typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6]! & 0x0f) | 0x40 // v4
        bytes[8] = (bytes[8]! & 0x3f) | 0x80 // RFC 4122 variant
        const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`
      }
      // Math.random fallback for the (rare) environments with no WebCrypto at all.
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }) as `${string}-${string}-${string}-${string}-${string}`
    }

    Object.defineProperty(crypto, 'randomUUID', {
      value: generate,
      writable: true,
      configurable: true,
    })
  },
})
