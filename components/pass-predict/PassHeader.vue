<template>
  <div
    @click="$emit('toggle')"
    class="flex items-center justify-between mb-1 cursor-pointer rounded py-1 px-2 transition-all duration-300 ease-in-out hover:scale-[1.01] group"
    :class="[
      isExpanded ? 'bg-space-800' : 'hover:bg-space-800',
      { 'passing-header': isPassing && !isStationary }
    ]"
  >
    <div class="flex items-center gap-2 w-full">
      <div class="flex flex-col w-full">
        <!-- First row: Satellite name + max elevation -->
        <div class="flex items-center pt-0 pb-1 leading-1">
          <div class="text-sm font-medium text-primary-300 group-hover:text-primary-200 transition-colors duration-300 ease-in-out w-[60%] py-0.5 pb-2">
            {{ pass.satelliteName }}
          </div>
          <span class="text-xs text-green-400 group-hover:text-green-300 transition-colors duration-300 ease-in-out w-[40%] text-right flex-shrink-0 mr-2 font-medium">
            {{ Math.round(pass.maxElevation) }}° max
          </span>
        </div>
        <!-- Second row: NORAD ID + time until pass + countdown -->
        <div class="flex items-center justify-between text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out -mt-2 pb-2">
          <div class="flex items-center gap-2">
            <span>NORAD ID: {{ pass.noradId }}</span>
            <span class="text-primary-400 font-medium">
              {{ formatTimeUntilPass(pass.startTime, pass.endTime, pass.noradId, pass) }}
            </span>
          </div>
          <div v-if="isPassing && !isStationary" class="text-red-400 font-medium font-mono mr-2">
            {{ timeUntilEnd }}
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <div class="transform transition-transform duration-500 ease-in-out" :class="{ 'rotate-180': isExpanded }">
        <svg class="w-4 h-4 text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  pass: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  isPassing: {
    type: Boolean,
    default: false
  },
  formatTimeUntilPass: {
    type: Function,
    required: true
  },
  getPassStatus: {
    type: Function,
    required: true
  }
})

// Check if this is a stationary satellite
const isStationary = computed(() => {
  const status = props.getPassStatus(props.pass.startTime, props.pass.endTime, props.pass.noradId, props.pass)
  return status === 'stationary'
})

// Compute time until end of pass (for passing satellites)
const timeUntilEnd = computed(() => {
  if (!props.isPassing || isStationary.value) return ''
  
  const now = Date.now()
  const timeRemaining = props.pass.endTime - now
  
  if (timeRemaining <= 0) return ''
  
  const minutes = Math.floor(timeRemaining / (1000 * 60))
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

defineEmits(['toggle'])
</script>

<style scoped>
/* Blinking animation for passing satellites */
@keyframes blink {
  0%, 50% { 
    background-color: rgba(31, 41, 55, 0.8); /* bg-space-800 */
  }
  51%, 100% { 
    background-color: rgba(31, 41, 55, 0.4); /* lighter version */
  }
}

.passing-header {
  animation: blink 1s infinite;
}
</style>
