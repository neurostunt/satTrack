<template>
  <div v-if="combinedData && Object.keys(combinedData).length > 0" class="max-w-lg mx-auto mb-6">
    <div class="bg-space-800 border border-space-700 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
        📡 Combined Satellite Data
        <span class="ml-2 text-sm text-space-300">({{ Object.keys(combinedData).length }} satellites)</span>
      </h3>

      <div class="space-y-4">
        <div
          v-for="(data, noradId) in combinedData"
          :key="noradId"
          class="bg-space-900 border border-space-600 rounded p-3"
          :class="{ 'bg-space-800': isSatelliteExpanded(noradId) }"
        >
          <!-- Clickable Header -->
          <div
            @click="toggleSatelliteData(noradId)"
            class="flex items-center justify-between mb-1 cursor-pointer rounded py-1 px-2 transition-all duration-300 ease-in-out hover:scale-[1.01] group"
            :class="isSatelliteExpanded(noradId) ? 'bg-space-800' : 'hover:bg-space-800'"
          >
            <div class="flex items-center gap-2 w-full">
              <!-- Satellite Image -->
              <div v-if="data.satellite?.image" class="flex-shrink-0">
                <img
                  :src="data.satellite.image"
                  :alt="data.satellite.name"
                  class="w-12 h-12 object-cover rounded border border-space-600 bg-space-700"
                  @error="handleImageError"
                  loading="lazy"
                />
              </div>
              <div class="flex flex-col w-full">
        <!-- First row: Main satellite name -->
        <div class="flex items-center pt-0 pb-1 leading-1">
          <div class="text-sm font-medium text-primary-300 group-hover:text-primary-200 transition-colors duration-300 ease-in-out py-0.5 truncate">
            {{ truncateSatelliteName(getFormattedSatelliteName(data.satellite, noradId).primary) }}
          </div>
        </div>
                <!-- Second row: Secondary name + NORAD ID (proper spacing) -->
                <div class="flex items-center gap-2 text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out mt-1 pb-2">
                  <span v-if="getFormattedSatelliteName(data.satellite, noradId).secondary">
                    {{ getFormattedSatelliteName(data.satellite, noradId).secondary }} -
                  </span>
                  <span>NORAD ID: {{ noradId }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="transform transition-transform duration-500 ease-in-out" :class="{ 'rotate-180': isSatelliteExpanded(noradId) }">
                <svg class="w-4 h-4 text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Collapsible Content -->
          <Transition
            name="slide-down"
            enter-active-class="transition-all duration-700 ease-out"
            leave-active-class="transition-all duration-500 ease-in"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-[2000px] opacity-100"
            leave-from-class="max-h-[2000px] opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div
              v-show="isSatelliteExpanded(noradId)"
              class="overflow-hidden"
            >
              <!-- Satellite Image Tab -->
              <div v-if="data.satellite?.image" class="mb-3">
                <div
                  class="text-sm text-space-300 mb-2 cursor-pointer hover:text-primary-400 transition-colors flex items-center justify-between"
                  @click="toggleSection(noradId, 'image')"
                >
                  <span>🖼️ Sat Image</span>
                  <svg
                    class="w-4 h-4 transition-transform duration-300"
                    :class="{ 'rotate-180': isSectionExpanded(noradId, 'image') }"
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
                  <div v-if="isSectionExpanded(noradId, 'image')" class="bg-space-800 border border-space-500 rounded p-2">
                    <img
                      :src="data.satellite.image"
                      :alt="data.satellite.name"
                      class="w-full max-w-md mx-auto object-contain rounded border border-space-600 bg-space-700"
                      @error="handleImageError"
                      loading="lazy"
                    />
                  </div>
                </Transition>
              </div>

              <!-- Orbital Parameters Box -->
              <div v-if="getTLEData(parseInt(noradId))" class="mb-3">
                <div
                  class="text-sm text-space-300 mb-2 cursor-pointer hover:text-primary-400 transition-colors flex items-center justify-between"
                  @click="toggleSection(noradId, 'tle')"
                >
                  <span>🛰️ Orbital Parameters (TLE)</span>
                  <svg
                    class="w-4 h-4 transition-transform duration-300"
                    :class="{ 'rotate-180': isSectionExpanded(noradId, 'tle') }"
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
                  <div v-if="isSectionExpanded(noradId, 'tle')" class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="text-xs text-space-400 space-y-1 font-mono">
                      <div v-if="getTLEData(parseInt(noradId)).line1" class="break-all">{{ getTLEData(parseInt(noradId)).line1 }}</div>
                      <div v-if="getTLEData(parseInt(noradId)).line2" class="break-all">{{ getTLEData(parseInt(noradId)).line2 }}</div>
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Transmitter Information -->
              <div v-if="data.transmitters && data.transmitters.length > 0" class="mb-3">
                <div
                  class="text-sm text-space-300 mb-2 cursor-pointer hover:text-primary-400 transition-colors flex items-center justify-between"
                  @click="toggleSection(noradId, 'transmitters')"
                >
                  <span>📡 Transmitter Information</span>
                  <svg
                    class="w-4 h-4 transition-transform duration-300"
                    :class="{ 'rotate-180': isSectionExpanded(noradId, 'transmitters') }"
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
                  <div v-if="isSectionExpanded(noradId, 'transmitters')" class="space-y-2">
                    <div
                      v-for="transmitter in data.transmitters"
                      :key="transmitter.id"
                      class="bg-space-800 border border-space-500 rounded p-2 text-xs"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <div class="font-medium text-space-200">{{ getCleanDescription(transmitter.description) }}</div>
                        <div class="text-space-400">{{ transmitter.mode }}</div>
                      </div>

                      <!-- Frequency Information -->
                      <div class="text-space-300 mb-2 mt-2 space-y-1">
                        <div v-if="transmitter.downlink_low" class="flex justify-between">
                          <span class="text-space-400">Downlink:</span>
                          <span class="text-green-400">{{ formatFrequencyValue(transmitter.downlink_low) }}</span>
                        </div>
                        <div v-if="transmitter.uplink_low" class="flex justify-between">
                          <span class="text-space-400">Uplink:</span>
                          <span class="text-blue-400">{{ formatFrequencyValue(transmitter.uplink_low) }}</span>
                        </div>
                        <div v-if="transmitter.downlink_high && transmitter.downlink_high !== transmitter.downlink_low" class="flex justify-between">
                          <span class="text-space-400">Downlink High:</span>
                          <span class="text-green-400">{{ formatFrequencyValue(transmitter.downlink_high) }}</span>
                        </div>
                        <div v-if="transmitter.uplink_high && transmitter.uplink_high !== transmitter.uplink_low" class="flex justify-between">
                          <span class="text-space-400">Uplink High:</span>
                          <span class="text-blue-400">{{ formatFrequencyValue(transmitter.uplink_high) }}</span>
                        </div>
                      </div>

                      <!-- CTCSS and Additional Info -->
                      <div class="text-space-500 text-xs">
                        <div v-if="transmitter.callsign" class="text-purple-400 font-medium">Callsign: {{ transmitter.callsign }}</div>
                        <div v-if="transmitter.ctcss" class="text-yellow-400">CTCSS: {{ transmitter.ctcss }} Hz</div>
                        <div v-if="transmitter.power" class="mt-1">Power: {{ transmitter.power }}</div>
                        <div v-if="transmitter.baud" class="mt-1">Baud: {{ transmitter.baud }}</div>
                        <div v-if="transmitter.modulation" class="mt-1">Modulation: {{ transmitter.modulation }}</div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Satellite Status -->
              <div v-if="data.satellite?.status" class="mb-3">
                <div
                  class="text-sm text-space-300 mb-2 cursor-pointer hover:text-primary-400 transition-colors flex items-center justify-between"
                  @click="toggleSection(noradId, 'status')"
                >
                  <span>📊 Satellite Status</span>
                  <svg
                    class="w-4 h-4 transition-transform duration-300"
                    :class="{ 'rotate-180': isSectionExpanded(noradId, 'status') }"
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
                  <div v-if="isSectionExpanded(noradId, 'status')" class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="space-y-1.5">
                      <div class="flex items-center gap-2">
                        <span :class="getStatusColor(data.satellite.status)" class="font-medium">{{ getStatusText(data.satellite.status) }}</span>
                        <span class="text-space-400">{{ data.satellite.names || 'No additional names' }}</span>
                      </div>
                      <div v-if="data.satellite.launchDate" class="flex justify-between">
                        <span class="text-space-400">🚀 Launch Date:</span>
                        <span class="text-space-300">{{ data.satellite.launchDate }}</span>
                      </div>
                      <div v-if="data.satellite.operator" class="flex justify-between">
                        <span class="text-space-400">👤 Operator:</span>
                        <span class="text-space-300">{{ data.satellite.operator }}</span>
                      </div>
                      <div v-if="data.satellite.countries" class="flex justify-between">
                        <span class="text-space-400">🌍 Countries:</span>
                        <span class="text-space-300">{{ data.satellite.countries }}</span>
                      </div>
                      <div v-if="data.satellite.website" class="flex justify-between">
                        <span class="text-space-400">🔗 Website:</span>
                        <a :href="data.satellite.website" target="_blank" rel="noopener noreferrer" class="text-primary-400 hover:text-primary-300 underline">
                          Link
                        </a>
                      </div>
                      <div v-if="data.satellite.decayed" class="flex justify-between">
                        <span class="text-space-400">💥 Decayed:</span>
                        <span class="text-space-300">{{ data.satellite.decayed }}</span>
                      </div>
                      <div v-if="data.satellite.deployed" class="flex justify-between">
                        <span class="text-space-400">📅 Deployed:</span>
                        <span class="text-space-300">{{ data.satellite.deployed }}</span>
                      </div>
                      <!-- SATCAT Data from CelesTrak -->
                      <div v-if="data.satellite.objectId" class="mt-2 pt-2 border-t border-space-600 space-y-1.5">
                        <div class="text-space-400 text-xs mb-1 font-medium">📋 Additional Details (SATCAT):</div>
                        <div v-if="data.satellite.objectId" class="flex justify-between">
                          <span class="text-space-400">🆔 International Designator:</span>
                          <span class="text-space-300">{{ data.satellite.objectId }}</span>
                        </div>
                        <div v-if="data.satellite.objectType" class="flex justify-between">
                          <span class="text-space-400">📦 Object Type:</span>
                          <span class="text-space-300">{{ getObjectTypeText(data.satellite.objectType) }}</span>
                        </div>
                        <div v-if="data.satellite.launchSite" class="flex justify-between">
                          <span class="text-space-400">🚀 Launch Site:</span>
                          <span class="text-space-300">{{ data.satellite.launchSite }}</span>
                        </div>
                        <div v-if="data.satellite.owner" class="flex justify-between">
                          <span class="text-space-400">👤 Owner:</span>
                          <span class="text-space-300">{{ data.satellite.owner }}</span>
                        </div>
                        <div v-if="data.satellite.rcs !== undefined && data.satellite.rcs !== null" class="flex justify-between">
                          <span class="text-space-400">📏 Size (RCS):</span>
                          <span class="text-space-300">{{ data.satellite.rcs.toFixed(2) }} m²</span>
                        </div>
                        <div v-if="data.satellite.opsStatusCode" class="flex justify-between">
                          <span class="text-space-400">⚡ Operational Status:</span>
                          <span class="text-space-300">{{ getOpsStatusText(data.satellite.opsStatusCode) }}</span>
                        </div>
                        <div v-if="data.satellite.apogee && data.satellite.perigee" class="flex justify-between">
                          <span class="text-space-400">🌍 Orbit:</span>
                          <span class="text-space-300">{{ data.satellite.perigee }} - {{ data.satellite.apogee }} km</span>
                        </div>
                        <div v-if="data.satellite.inclination" class="flex justify-between">
                          <span class="text-space-400">📐 Inclination:</span>
                          <span class="text-space-300">{{ data.satellite.inclination.toFixed(2) }}°</span>
                        </div>
                        <div v-if="data.satellite.period" class="flex justify-between">
                          <span class="text-space-400">⏱️ Period:</span>
                          <span class="text-space-300">{{ data.satellite.period.toFixed(2) }} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
// Import satellite name utilities
import { formatSatelliteNameForDisplay, truncateSatelliteName } from '~/utils/satelliteNameUtils'

// Props
const props = defineProps({
  combinedData: {
    type: Object,
    required: true
  },
  getTLEData: {
    type: Function,
    required: true
  },
  formatFrequency: {
    type: Function,
    required: true
  }
})

// Format frequency value for display
const formatFrequencyValue = (frequency) => {
  if (!frequency) return 'Unknown'

  // Handle different frequency formats
  if (typeof frequency === 'number') {
    if (frequency >= 1000000) {
      return `${(frequency / 1000000).toFixed(3)} MHz`
    } else if (frequency >= 1000) {
      return `${(frequency / 1000).toFixed(0)} kHz`
    } else {
      return `${frequency} Hz`
    }
  }

  // If it's already a string, return as-is
  return frequency.toString()
}

// Reactive state
const expandedSatellites = ref(new Set())
// Track expanded sections per satellite (for non-image sections)
const expandedSections = ref(new Map())
// Track collapsed sections (for image sections which are expanded by default)
const collapsedSections = ref(new Map())

// Functions
const getFormattedSatelliteName = (satellite, noradId) => {
  return formatSatelliteNameForDisplay(satellite, noradId)
}

const toggleSatelliteData = (noradId) => {
  if (expandedSatellites.value.has(noradId)) {
    expandedSatellites.value.delete(noradId)
  } else {
    expandedSatellites.value.add(noradId)
  }
}

const isSatelliteExpanded = (noradId) => {
  return expandedSatellites.value.has(noradId)
}

// Toggle individual section (TLE, Transmitters, Status, Image)
const toggleSection = (noradId, section) => {
  const key = `${noradId}-${section}`
  // Image sections are expanded by default, so we track if they're collapsed
  if (section === 'image') {
    if (collapsedSections.value.has(key)) {
      collapsedSections.value.delete(key)
    } else {
      collapsedSections.value.set(key, true)
    }
  } else {
    // Other sections: track if they're expanded
    if (expandedSections.value.has(key)) {
      expandedSections.value.delete(key)
    } else {
      expandedSections.value.set(key, true)
    }
  }
}

// Check if section is expanded
const isSectionExpanded = (noradId, section) => {
  const key = `${noradId}-${section}`
  // Image section is expanded by default unless explicitly collapsed
  if (section === 'image') {
    return !collapsedSections.value.has(key)
  }
  // Other sections: check if they're in the expanded map
  return expandedSections.value.has(key)
}

const getStatusColor = (status) => {
  switch (status) {
    case 'alive':
      return 'text-green-400'
    case 'dead':
      return 'text-red-400'
    case 're-entered':
      return 'text-orange-400'
    default:
      return 'text-space-400'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'alive':
      return 'ACTIVE'
    case 'dead':
      return 'INACTIVE'
    case 're-entered':
      return 'RE-ENTERED'
    default:
      return 'UNKNOWN'
  }
}

const getObjectTypeText = (objectType) => {
  const types = {
    'PAY': 'Payload',
    'R/B': 'Rocket Body',
    'DEB': 'Debris',
    'UNK': 'Unknown',
    'TBA': 'To Be Assigned'
  }
  return types[objectType] || objectType
}

const getOpsStatusText = (opsStatusCode) => {
  const statuses = {
    '+': 'Operational',
    '-': 'Non-Operational',
    'P': 'Partially Operational',
    'B': 'Backup',
    'S': 'Standby',
    'X': 'Extended Mission',
    'D': 'Decayed',
    '?': 'Unknown'
  }
  return statuses[opsStatusCode] || opsStatusCode
}

const getCleanDescription = (description) => {
  if (!description) return 'Unknown'
  // Remove CTCSS information from description
  return description.replace(/\(CTCSS:?\s*\d+(?:\.\d+)?\s*Hz\)/gi, '').trim()
}

// Handle image loading errors
const handleImageError = (event) => {
  // Hide broken images
  event.target.style.display = 'none'
}
</script>

<style scoped>
/* Custom styles if needed */
</style>
