import { ref } from 'vue'

export const useDeviceDetection = () => {
  const isMobileDevice = ref(false)

  if (typeof navigator !== 'undefined') {
    isMobileDevice.value = navigator.maxTouchPoints > 0
  }

  return { isMobileDevice }
}
