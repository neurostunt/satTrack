/**
 * Simple PWA Install Composable
 * Handles the beforeinstallprompt event and provides install functionality
 */
export const usePWAInstall = () => {
  const deferredPrompt = ref<any>(null)
  const isInstallable = ref(false)
  const isInstalled = ref(false)

  // Check if already installed
  const checkInstalled = () => {
    if (import.meta.server) return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )
  }

  // Initialize on mount
  onMounted(() => {
    isInstalled.value = checkInstalled()

    // Listen for beforeinstallprompt event
    // Don't call preventDefault() - allows browser's native install button in URL bar
    const beforeInstallHandler = (e: Event) => {
      deferredPrompt.value = e
      isInstallable.value = true
    }
    
    window.addEventListener('beforeinstallprompt', beforeInstallHandler)

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      isInstallable.value = false
      deferredPrompt.value = null
    })
  })

  // Install PWA
  const install = async (): Promise<boolean> => {
    if (!deferredPrompt.value) {
      return false
    }

    try {
      // Show the install prompt
      deferredPrompt.value.prompt()
      
      // Wait for user response
      const { outcome } = await deferredPrompt.value.userChoice
      
      if (outcome === 'accepted') {
        isInstalled.value = true
        isInstallable.value = false
        deferredPrompt.value = null
        return true
      }
      
      deferredPrompt.value = null
      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }

  // Check if iOS
  const isIOS = computed(() => {
    if (import.meta.server) return false
    const userAgent = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(userAgent)
  })

  return {
    isInstallable: readonly(isInstallable),
    isInstalled: readonly(isInstalled),
    isIOS,
    install
  }
}
