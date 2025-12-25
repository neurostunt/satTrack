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
      <div v-if="showPassDetails && isParentExpanded" class="bg-space-800 border border-space-500 rounded p-2 text-xs">
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
      <span>📡 Available Transmitters: {{ filteredTransmitters.length }} / {{ pass.transmitterCount }}</span>
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
      <div v-if="showTransmitters && isParentExpanded" class="bg-space-800 border border-space-500 rounded p-2 text-xs">
        <div v-if="filteredTransmitters.length > 0" class="space-y-2">
          <div
            v-for="(transmitter, index) in filteredTransmitters"
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
              <div class="text-right font-mono">
                <span v-if="getShiftedFrequency(transmitter.downlink_low)" class="text-orange-400 font-medium">
                  {{ getShiftedFrequency(transmitter.downlink_low) }}
                </span>
                <span v-else class="text-space-200">{{ formatFrequency(transmitter.downlink_low) }}</span>
                <span v-if="getShiftedFrequency(transmitter.downlink_low)" class="text-space-400 text-[11px] ml-1">
                  ({{ formatFrequency(transmitter.downlink_low) }})
                </span>
              </div>
            </div>
            <div v-if="transmitter.uplink_low" class="flex justify-between">
              <span class="text-space-400">Uplink:</span>
              <div class="text-right font-mono">
                <span v-if="getShiftedFrequency(transmitter.uplink_low)" class="text-orange-400 font-medium">
                  {{ getShiftedFrequency(transmitter.uplink_low) }}
                </span>
                <span v-else class="text-space-200">{{ formatFrequency(transmitter.uplink_low) }}</span>
                <span v-if="getShiftedFrequency(transmitter.uplink_low)" class="text-space-400 text-[11px] ml-1">
                  ({{ formatFrequency(transmitter.uplink_low) }})
                </span>
              </div>
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

  <!-- AR Tracking Button (shown when passing) -->
  <div v-if="isPassing" class="mb-3">
    <NuxtLink
      :to="`/ar-track?noradId=${pass.noradId}&startTime=${pass.startTime}`"
      class="block w-full py-2 bg-primary-600 hover:bg-primary-700 border border-primary-500 rounded-lg text-center text-white font-medium transition-all duration-200 flex items-center justify-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      <span>AR Track</span>
    </NuxtLink>
  </div>
</template>

<script setup>
import { calculateDopplerShift } from '~/utils/dopplerCalculations'
import { formatFrequencyHighPrecision } from '~/utils/frequencyUtils'
import { matchesTransmitterFilters } from '~/utils/transmitterCategorization'
import { useSettings } from '~/composables/storage/useSettings'

const { settings } = useSettings()

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
  },
  isPassing: {
    type: Boolean,
    default: false
  },
  isGeostationary: {
    type: Boolean,
    default: false
  },
  radialVelocity: {
    type: Number,
    default: 0
  },
  isParentExpanded: {
    type: Boolean,
    default: true
  }
})

const showPassDetails = ref(false)
const showTransmitters = ref(false)

const filteredTransmitters = computed(() => {
  const satData = props.getSatelliteData(props.pass.noradId)
  const allTransmitters = satData?.transmitters || []
  const aliveTransmitters = allTransmitters.filter(t => t.alive !== false)

  if (settings.value?.transmitterFilters) {
    const filters = settings.value.transmitterFilters
    return aliveTransmitters.filter(transmitter =>
      matchesTransmitterFilters(transmitter, filters)
    )
  }

  return aliveTransmitters
})

const togglePassDetails = () => {
  showPassDetails.value = !showPassDetails.value
}

const toggleTransmitters = () => {
  showTransmitters.value = !showTransmitters.value
}

const formatFrequency = (frequency) => {
  return formatFrequencyHighPrecision(frequency)
}

const getShiftedFrequency = computed(() => {
  return (frequency) => {
    if (!props.isPassing || props.isGeostationary || !frequency) {
      return null
    }

    if (props.radialVelocity === null || props.radialVelocity === undefined) {
      return null
    }

    const doppler = calculateDopplerShift(frequency, props.radialVelocity)
    return formatFrequencyHighPrecision(doppler.shiftedFrequency)
  }
})
</script>
