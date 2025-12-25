<template>
  <div v-if="showStatus" class="fixed top-6 right-6 z-50">
    <div class="card satellite-glow flex items-center gap-3 text-sm" :class="statusClass">
      <span class="text-lg">{{ statusIcon }}</span>
      <span class="font-medium">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup>
const showStatus = ref(false)
const statusClass = ref('')
const statusIcon = ref('')
const statusText = ref('')

onMounted(() => {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    showStatus.value = true
    statusClass.value = 'border-primary-500 text-primary-400'
    statusIcon.value = '📱'
    statusText.value = 'Running as PWA'
  } else if (window.navigator.standalone === true) {
    showStatus.value = true
    statusClass.value = 'border-orange-500 text-orange-400'
    statusIcon.value = '🍎'
    statusText.value = 'iOS Standalone'
  }

  window.addEventListener('appinstalled', () => {
    showStatus.value = true
    statusClass.value = 'border-green-500 text-green-400 animate-pulse'
    statusIcon.value = '✅'
    statusText.value = 'App Installed!'
    
    setTimeout(() => {
      showStatus.value = false
    }, 3000)
  })
})
</script>

<style scoped>
</style>
