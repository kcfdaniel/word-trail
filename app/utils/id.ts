/**
 * Generate a RFC 4122 v4 UUID, falling back for environments that don't
 * expose crypto.randomUUID (older browsers, or non-secure contexts where
 * the Web Crypto API is gated behind HTTPS).
 */
export const randomUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // getRandomValues is available in virtually every browser, including
  // non-secure contexts and older versions where randomUUID is missing.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40 // v4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80 // RFC 4122 variant
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Last-resort Math.random fallback. NOT cryptographically secure —
  // good enough for local script IDs, which is the only place we use this.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
