<template>
  <div class="max-w-lg mx-auto mb-6" @click="handleClickOutside">
    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-primary-400">Tracked Satellites</h3>
        <button
          @click="$emit('fetch-all-data')"
          class="btn-primary text-xs px-3 py-1"
          :disabled="tleLoading || isTestingCombined"
        >
          {{ (tleLoading || isTestingCombined) ? 'Fetching...' : 'Fetch TLE & Transmitter Data' }}
        </button>
      </div>

      <!-- Data Fetch Status -->
      <div v-if="spaceTrackFetchStatus.show || satnogsFetchStatus.show" class="mb-4 p-3 bg-space-800 border border-space-700 rounded text-xs">
        <div v-if="spaceTrackFetchStatus.show" class="mb-2">
          <div class="flex items-center justify-between">
            <span class="text-space-300">TLE Data:</span>
            <span :class="{
              'text-green-400': spaceTrackFetchStatus.status === 'success',
              'text-red-400': spaceTrackFetchStatus.status === 'error',
              'text-yellow-400': spaceTrackFetchStatus.status === 'warning'
            }">
              {{ spaceTrackFetchStatus.message }}
            </span>
          </div>
          <div v-if="spaceTrackFetchStatus.progress" class="text-space-400 mt-1">
            {{ spaceTrackFetchStatus.progress }}
          </div>
        </div>
        <div v-if="satnogsFetchStatus.show">
          <div class="flex items-center justify-between">
            <span class="text-space-300">Transmitter Data:</span>
            <span :class="{
              'text-green-400': satnogsFetchStatus.status === 'success',
              'text-red-400': satnogsFetchStatus.status === 'error',
              'text-yellow-400': satnogsFetchStatus.status === 'warning'
            }">
              {{ satnogsFetchStatus.message }}
            </span>
          </div>
          <div v-if="satnogsFetchStatus.progress" class="text-space-400 mt-1">
            {{ satnogsFetchStatus.progress }}
          </div>
        </div>
      </div>

      <!-- Search Satellite -->
      <div class="mb-4" @click.stop>
        <label class="block text-xs font-medium text-space-300 mb-1">Search Satellite</label>
        <div class="relative">
            <input
              :value="searchQuery"
              @input="$emit('update:searchQuery', $event.target.value)"
              @keydown.enter="handleEnterKey"
              @keydown.arrow-down="handleArrowDown"
              @keydown.arrow-up="handleArrowUp"
              @keydown.escape="clearSearch"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
              type="text"
              class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none pr-8 box-border"
              placeholder="Search by name or NORAD ID..."
            />
          <div v-if="searchLoading" class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <div class="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="searchLoading" class="mt-2 flex items-center gap-2 text-xs text-space-300">
          <div class="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          <span>Searching satellites...</span>
        </div>

        <!-- Search Results -->
        <div v-if="showResults && searchResults.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-space-700 rounded bg-space-800">
          <div
            v-for="(satellite, index) in searchResults"
            :key="satellite.sat_id"
            @click="handleClick(satellite)"
            class="p-2 cursor-pointer border-b border-space-700 last:border-b-0 transition-colors duration-200"
            :class="{
              'bg-space-700': selectedIndex === index,
              'hover:bg-space-700': selectedIndex !== index
            }"
          >
            <div class="text-sm font-medium text-space-200">
              {{ satellite.name }} (NORAD: {{ satellite.norad_cat_id }})
            </div>
            <div class="text-xs text-space-400">
              Status: {{ satellite.status }} | Operator: {{ satellite.operator || 'Unknown' }}
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="showResults && !searchLoading && searchQuery.length >= 3 && searchResults.length === 0 && !searchError" class="mt-2 text-space-400 text-xs">
          No satellites found for "{{ searchQuery }}"
        </div>

        <!-- Search Error -->
        <div v-if="searchError" class="mt-2 text-red-400 text-xs">
          {{ searchError }}
        </div>

        <!-- Search Hint -->
        <div v-if="searchQuery.length > 0 && searchQuery.length < 3" class="mt-2 text-space-400 text-xs">
          Type at least 3 characters to search
        </div>

        <!-- No Token Warning -->
        <div v-if="!settings.satnogsToken" class="mt-2 text-yellow-400 text-xs">
          ⚠️ SatNOGS API token required for satellite search. Please add your token above.
        </div>
      </div>

      <!-- Tracked Satellites List -->
      <div class="space-y-4">
        <div
          v-for="satellite in settings.trackedSatellites"
          :key="satellite.noradId"
          class="bg-space-900 border border-space-600 rounded p-3"
        >
          <!-- Clickable Header -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <div class="flex flex-col">
        <!-- First row: Main satellite name -->
        <h4 class="font-semibold text-primary-300 pt-0 pb-0.5 leading-1">
          {{ getFormattedSatelliteName(satellite).primary }}
        </h4>
                <!-- Second row: Secondary name + NORAD ID (closer spacing) -->
                <div class="flex items-center gap-2 text-xs text-space-400 -mt-2 pb-2">
                  <span v-if="getFormattedSatelliteName(satellite).secondary">
                    {{ getFormattedSatelliteName(satellite).secondary }} -
                  </span>
                  <span>NORAD ID: {{ satellite.noradId }}</span>
                </div>
              </div>
              <!-- <span class="text-xs text-green-400 font-medium">{{ satellite.status || 'alive' }}</span> -->
            </div>
            <button
              @click="$emit('remove-satellite', satellite.noradId)"
              class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors duration-200 font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Import satellite name utilities
import { getFullSatelliteName, formatSatelliteNameForDisplay } from '~/utils/satelliteNameUtils'

// Props
const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  tleLoading: {
    type: Boolean,
    default: false
  },
  isTestingCombined: {
    type: Boolean,
    default: false
  },
  spaceTrackFetchStatus: {
    type: Object,
    required: true
  },
  satnogsFetchStatus: {
    type: Object,
    required: true
  },
  searchQuery: {
    type: String,
    required: true
  },
  searchLoading: {
    type: Boolean,
    default: false
  },
  searchResults: {
    type: Array,
    required: true
  },
  searchError: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['fetch-all-data', 'add-satellite', 'remove-satellite', 'update:searchQuery'])

// Reactive state for keyboard navigation
const selectedIndex = ref(-1)
const showResults = ref(false)

// Functions
const formatSatellite = (satellite) => {
  // Swap name and names - "names" is the full name, "name" is the short name
  const formatted = {
    name: satellite.names || satellite.name,    // Full name (SAUDISAT 1C)
    noradId: satellite.norad_cat_id,
    status: satellite.status,
    names: satellite.name                       // Short name (SO-50)
  }
  return formatted
}

// Click handler
const handleClick = (satellite) => {
  console.log('🚀 handleClick called!')
  console.log('🔍 handleClick called with:', satellite)
  emit('add-satellite', formatSatellite(satellite))
  showResults.value = false
  selectedIndex.value = -1
}

// Keyboard navigation functions
const handleEnterKey = () => {
  console.log('🔍 handleEnterKey called, selectedIndex:', selectedIndex.value)
  if (props.searchResults.length > 0 && selectedIndex.value >= 0) {
    const satellite = props.searchResults[selectedIndex.value]
    console.log('🔍 Emitting add-satellite with:', satellite)
    emit('add-satellite', formatSatellite(satellite))
    showResults.value = false
    selectedIndex.value = -1
  }
}

const handleArrowDown = (event) => {
  event.preventDefault()
  if (props.searchResults.length > 0) {
    selectedIndex.value = Math.min(selectedIndex.value + 1, props.searchResults.length - 1)
  }
}

const handleArrowUp = (event) => {
  event.preventDefault()
  if (props.searchResults.length > 0) {
    selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
  }
}

const clearSearch = () => {
  emit('update:searchQuery', '')
  showResults.value = false
  selectedIndex.value = -1
}

// Handle input focus/blur
const handleInputFocus = () => {
  if (props.searchQuery.length >= 3 && props.searchResults.length > 0) {
    showResults.value = true
  }
}

const handleInputBlur = () => {
  // Delay hiding to allow clicks on results
  setTimeout(() => {
    showResults.value = false
  }, 150)
}

// Handle clicking outside
const handleClickOutside = () => {
  showResults.value = false
}

// Functions
const getFormattedSatelliteName = (satellite) => {
  return formatSatelliteNameForDisplay(satellite)
}

// Watch for search results changes to reset selection and show results
watch(() => props.searchResults, (newResults) => {
  selectedIndex.value = -1
  if (newResults && newResults.length > 0 && props.searchQuery.length >= 3) {
    showResults.value = true
  }
})

// Watch for search query changes
watch(() => props.searchQuery, (newQuery) => {
  if (newQuery.length >= 3 && props.searchResults.length > 0) {
    showResults.value = true
  } else if (newQuery.length < 3) {
    showResults.value = false
  }
})
</script>

<style scoped>
/* Fix for password manager extensions like Dashlane */
.relative {
  position: relative;
  overflow: hidden;
}

.relative input {
  box-sizing: border-box;
  width: 100%;
}

/* Ensure spinner is properly positioned */
.relative .absolute {
  z-index: 10;
}
</style>
