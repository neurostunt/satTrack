<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-primary-400">Tracked Satellites</h3>
        <button
          @click="fetchAllData"
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
              'text-green-400': spaceTrackFetchStatus.type === 'success',
              'text-blue-400': spaceTrackFetchStatus.type === 'info',
              'text-yellow-400': spaceTrackFetchStatus.type === 'warning',
              'text-red-400': spaceTrackFetchStatus.type === 'error'
            }">
              {{ spaceTrackFetchStatus.message }}
            </span>
          </div>
          <div v-if="spaceTrackFetchStatus.details" class="text-space-400 mt-1">
            {{ spaceTrackFetchStatus.details }}
          </div>
          <div v-if="spaceTrackFetchStatus.progress" class="text-space-500 mt-1">
            {{ spaceTrackFetchStatus.progress }}
          </div>
        </div>
        <div v-if="satnogsFetchStatus.show">
          <div class="flex items-center justify-between">
            <span class="text-space-300">Transmitter Data:</span>
            <span :class="{
              'text-green-400': satnogsFetchStatus.type === 'success',
              'text-blue-400': satnogsFetchStatus.type === 'info',
              'text-yellow-400': satnogsFetchStatus.type === 'warning',
              'text-red-400': satnogsFetchStatus.type === 'error'
            }">
              {{ satnogsFetchStatus.message }}
            </span>
          </div>
          <div v-if="satnogsFetchStatus.details" class="text-space-400 mt-1">
            {{ satnogsFetchStatus.details }}
          </div>
          <div v-if="satnogsFetchStatus.progress" class="text-space-500 mt-1">
            {{ satnogsFetchStatus.progress }}
          </div>
        </div>
      </div>

      <!-- Search Satellite -->
      <div class="mb-4">
        <label class="block text-xs font-medium text-space-300 mb-1">Search Satellite</label>
        <input
          :value="searchQuery"
          @input="handleSearchInput"
          type="text"
          class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
          placeholder="Type satellite name or NORAD ID (min 3 characters)"
        />

        <!-- Search Results -->
        <div v-if="searchResults.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-space-700 rounded bg-space-800">
          <div
            v-for="satellite in searchResults"
            :key="satellite.noradId"
            @click="addSatellite(satellite)"
            class="p-2 hover:bg-space-700 cursor-pointer border-b border-space-600 last:border-b-0"
          >
            <div class="text-sm font-semibold text-primary-300">{{ satellite.name }}</div>
            <div class="text-xs text-space-400">NORAD: {{ satellite.noradId }}</div>
            <div v-if="satellite.names" class="text-xs text-space-500">{{ satellite.names }}</div>
          </div>
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
      <div class="space-y-3">
        <div
          v-for="satellite in settings.trackedSatellites"
          :key="satellite.noradId"
          class="flex items-center justify-between p-2 bg-space-800 border border-space-700 rounded"
        >
          <div>
            <div class="text-sm font-mono text-primary-400">{{ satellite.name }}</div>
            <div class="text-xs text-space-400">NORAD: {{ satellite.noradId }}</div>
            <div v-if="satellite.names" class="text-xs text-space-500">{{ satellite.names }}</div>
          </div>
          <button
            @click="removeSatellite(satellite.noradId)"
            class="text-red-300 hover:text-red-200 text-xs px-2 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
          >
            Remove
          </button>
        </div>

        <div v-if="settings.trackedSatellites.length === 0" class="text-center text-space-400 text-sm py-4">
          No satellites added yet. Search and click on a satellite to add it.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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
  searchResults: {
    type: Array,
    required: true
  },
  searchError: {
    type: String,
    default: ''
  },
  debouncedSearch: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['fetch-all-data', 'add-satellite', 'remove-satellite', 'update:search-query', 'search-input'])

const fetchAllData = () => {
  emit('fetch-all-data')
}

const addSatellite = (satellite) => {
  emit('add-satellite', satellite)
}

const removeSatellite = (noradId) => {
  emit('remove-satellite', noradId)
}

const handleSearchInput = (event) => {
  const value = event.target.value
  emit('update:search-query', value)
  emit('search-input', value)
}
</script>
