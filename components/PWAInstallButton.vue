<template>
  <div v-if="showButton" class="fixed bottom-20 md:bottom-6 right-4 z-50">
    <button
      v-if="!isIOS"
      @click="handleInstall"
      class="btn-primary flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg satellite-glow"
      :disabled="!isInstallable"
    >
      <span class="text-lg">📱</span>
      <span class="font-medium">Install App</span>
    </button>
    
    <div
      v-else
      class="card satellite-glow p-4 max-w-xs"
    >
      <p class="text-sm text-space-300 mb-2">
        To install this app on your iOS device:
      </p>
      <ol class="text-xs text-space-400 list-decimal list-inside space-y-1">
        <li>Tap the Share button</li>
        <li>Select "Add to Home Screen"</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isInstallable, isInstalled, isIOS, install } = usePWAInstall()

const showButton = computed(() => {
  return !isInstalled.value && (isInstallable.value || isIOS.value)
})

const handleInstall = async () => {
  if (isInstallable.value) {
    await install()
  }
}
</script>
