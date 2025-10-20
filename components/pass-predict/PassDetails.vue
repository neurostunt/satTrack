<template>
  <!-- Pass Details -->
  <div class="mb-3">
    <div 
      class="text-sm text-space-300 mb-2 cursor-pointer hover:text-primary-400 transition-colors flex items-center justify-between"
      @click="togglePassDetails"
    >
      <span>🛰️ Pass Details</span>
      <svg 
        class="w-4 h-4 transition-transform duration-300" 
        :class="{ 'rotate-180': showPassDetails }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </div>
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="transform scale-y-0 opacity-0 origin-top"
      enter-to-class="transform scale-y-100 opacity-100 origin-top"
      leave-from-class="transform scale-y-100 opacity-100 origin-top"
      leave-to-class="transform scale-y-0 opacity-0 origin-top"
    >
      <div v-if="showPassDetails" class="bg-space-800 border border-space-500 rounded p-2 text-xs">
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
          <!-- Column 1 -->
          <div class="flex justify-between">
            <span class="text-space-400">Start Time:</span>
            <span class="text-space-200">{{ formatPassTime(pass.startTime) }}</span>
          </div>
          <!-- Column 2 -->
          <div class="flex justify-between">
            <span class="text-space-400">End Time:</span>
            <span class="text-space-200">{{ formatPassTime(pass.endTime) }}</span>
          </div>
          <!-- Column 1 -->
          <div class="flex justify-between">
            <span class="text-space-400">Duration:</span>
            <span class="text-space-200">{{ formatPassDuration(pass.duration) }}</span>
          </div>
          <!-- Column 2 -->
          <div class="flex justify-between">
            <span class="text-space-400">Max Elevation:</span>
            <span class="text-green-400 font-medium">{{ Math.round(pass.maxElevation) }}°</span>
          </div>
          <!-- Column 1 -->
          <div class="flex justify-between">
            <span class="text-space-400">Start Azimuth:</span>
            <span class="text-space-200">{{ Math.round(pass.startAzimuth) }}°</span>
          </div>
          <!-- Column 2 -->
          <div class="flex justify-between">
            <span class="text-space-400">End Azimuth:</span>
            <span class="text-space-200">{{ Math.round(pass.endAzimuth) }}°</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Transmitter Count -->
  <div v-if="pass.transmitterCount > 0" class="mb-3">
    <div 
      class="text-sm text-space-300 mb-2 cursor-pointer hover:text-primary-400 transition-colors flex items-center justify-between"
      @click="toggleTransmitters"
    >
      <span>📡 Available Transmitters: {{ pass.transmitterCount }}</span>
      <svg 
        class="w-4 h-4 transition-transform duration-300" 
        :class="{ 'rotate-180': showTransmitters }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </div>
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="transform scale-y-0 opacity-0 origin-top"
      enter-to-class="transform scale-y-100 opacity-100 origin-top"
      leave-from-class="transform scale-y-100 opacity-100 origin-top"
      leave-to-class="transform scale-y-0 opacity-0 origin-top"
    >
      <div v-if="showTransmitters" class="bg-space-800 border border-space-500 rounded p-2 text-xs">
        <div v-if="transmitters.length > 0" class="space-y-2">
          <div 
            v-for="(transmitter, index) in transmitters" 
            :key="index"
            class="border-t border-space-600 pt-2 space-y-1"
          >
            <div class="flex items-center justify-between">
              <div class="text-primary-400 font-medium">{{ transmitter.description || 'Transmitter ' + (index + 1) }}</div>
              <div v-if="transmitter.alive !== undefined" :class="transmitter.alive ? 'text-green-400' : 'text-red-400'" class="text-xs font-medium">
                {{ transmitter.alive ? 'Active' : 'Dead' }}
              </div>
            </div>
            <div v-if="transmitter.downlink_low" class="flex justify-between">
              <span class="text-space-400">Downlink:</span>
              <span class="text-space-200">{{ formatFrequency(transmitter.downlink_low) }}</span>
            </div>
            <div v-if="transmitter.uplink_low" class="flex justify-between">
              <span class="text-space-400">Uplink:</span>
              <span class="text-space-200">{{ formatFrequency(transmitter.uplink_low) }}</span>
            </div>
            <div v-if="transmitter.mode" class="flex justify-between">
              <span class="text-space-400">Mode:</span>
              <span class="text-space-200">{{ transmitter.mode }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  pass: {
    type: Object,
    required: true
  },
  getSatelliteData: {
    type: Function,
    required: true
  },
  formatPassTime: {
    type: Function,
    required: true
  },
  formatPassDuration: {
    type: Function,
    required: true
  },
  formatTimeUntilPass: {
    type: Function,
    required: true
  }
})

// State for pass details expansion
const showPassDetails = ref(false)

// State for transmitter expansion
const showTransmitters = ref(false)

// Get transmitters from satellite data
const transmitters = computed(() => {
  const satData = props.getSatelliteData(props.pass.noradId)
  return satData?.transmitters || []
})

// Toggle pass details
const togglePassDetails = () => {
  showPassDetails.value = !showPassDetails.value
}

// Toggle transmitter list
const toggleTransmitters = () => {
  showTransmitters.value = !showTransmitters.value
}

// Format frequency
const formatFrequency = (frequency) => {
  if (!frequency) return 'Unknown'
  
  if (frequency >= 1000000) {
    return `${(frequency / 1000000).toFixed(3)} MHz`
  } else if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(0)} kHz`
  } else {
    return `${frequency} Hz`
  }
}
</script>
