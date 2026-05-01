import { ref } from 'vue'

export function useDeviceDetection() {
  const isMobileDevice = ref(navigator.maxTouchPoints > 0)
  return { isMobileDevice }
}
