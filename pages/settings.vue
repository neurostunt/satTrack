<template>
  <div class="min-h-screen space-gradient p-4">
    <!-- Header -->
    <header class="text-center mb-6">
      <h1 class="text-2xl font-bold mb-1 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
        ⚙️ Settings
      </h1>
      <p class="text-space-300 text-sm">Configure SatTrack</p>
    </header>

    <!-- API Credentials -->
    <div class="max-w-lg mx-auto mb-6">
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-4 text-primary-400">API Credentials</h3>
        <div class="space-y-4">
          <!-- Space-Track.org Credentials -->
          <div>
            <h4 class="text-sm font-medium text-space-200 mb-2">Space-Track.org (TLE Data)</h4>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-space-300 mb-1">Username</label>
                <input
                  v-model="settings.spaceTrackUsername"
                  type="text"
                  class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-space-300 mb-1">Password</label>
                <input
                  v-model="settings.spaceTrackPassword"
                  type="password"
                  class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>
            </div>
          </div>

          <!-- SatNOGS API Token -->
          <div>
            <h4 class="text-sm font-medium text-space-200 mb-2">SatNOGS API (Transmitter Data)</h4>
            <div>
              <label class="block text-xs font-medium text-space-300 mb-1">API Token</label>
              <input
                v-model="settings.satnogsToken"
                type="text"
                class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
                placeholder="Enter your SatNOGS API token"
              />
            </div>
          </div>

          <!-- Save Credentials Button -->
          <button
            @click="saveSettings"
            class="btn-primary w-full text-sm"
            :disabled="isSavingSettings"
          >
            {{ isSavingSettings ? 'Saving...' : 'Save Credentials' }}
          </button>
        </div>
      </div>
    </div>


    <!-- Satellite Management -->
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
            <div v-if="spaceTrackFetchStatus.details" class="text-space-500 mt-1">
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
            <div v-if="satnogsFetchStatus.details" class="text-space-500 mt-1">
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
          <div class="relative">
            <input
              v-model="searchQuery"
              @input="debouncedSearch(searchQuery, settings.satnogsToken)"
              type="text"
              class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
              placeholder="Type satellite name or NORAD ID (min 3 characters)"
            />
            <div v-if="searchLoading" class="absolute right-3 top-2.5">
              <div class="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          </div>

          <!-- Search Results -->
          <div v-if="searchResults.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-space-700 rounded bg-space-800">
            <div
              v-for="satellite in searchResults"
              :key="satellite.sat_id"
              @click="addSatellite(formatSatellite(satellite))"
              class="px-3 py-2 hover:bg-space-700 cursor-pointer border-b border-space-700 last:border-b-0"
            >
              <div class="text-sm font-mono text-primary-400">{{ satellite.name }}</div>
              <div class="text-xs text-space-400">
                NORAD: {{ satellite.norad_cat_id }}
                <span v-if="satellite.names" class="ml-2">({{ satellite.names }})</span>
              </div>
              <div class="text-xs text-space-500">
                Status: {{ satellite.status }} | Operator: {{ satellite.operator || 'Unknown' }}
              </div>
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
            class="flex items-center justify-between bg-space-800 border border-space-700 rounded px-3 py-2"
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

    <!-- Storage Management -->
    <div class="max-w-lg mx-auto mb-6">
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-4 text-primary-400">Storage Management</h3>

        <div class="space-y-4">
          <!-- Storage Usage -->
          <div v-if="!isLoadingStorage && storageInfo.indexedDB" class="p-3 bg-space-800 border border-space-700 rounded text-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-space-300">Browser Storage:</span>
              <span class="text-primary-400">{{ storageInfo.indexedDB.used }} / {{ storageInfo.indexedDB.available }}</span>
            </div>
            <div class="w-full bg-space-700 rounded-full h-2">
              <div
                class="bg-primary-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: storageInfo.indexedDB.percentage }"
              ></div>
            </div>
            <div class="text-space-400 mt-1">
              <div>IndexedDB: {{ storageInfo.indexedDB.used }} |
              localStorage: {{ Math.round(storageInfo.localStorage?.total / 1024) || 0 }} KB</div>
              <div v-if="storageInfo.indexedDB.ourData" class="text-space-500 mt-1">
                Our Data: {{ storageInfo.indexedDB.ourData.total }}
                (TLE: {{ storageInfo.indexedDB.ourData.tle }},
                Settings: {{ storageInfo.indexedDB.ourData.settings }},
                Credentials: {{ storageInfo.indexedDB.ourData.credentials }})
              </div>
            </div>
          </div>

          <!-- Storage Actions -->
          <div class="flex gap-2 flex-wrap">
            <button
              @click="loadStorageInfo"
              class="btn-secondary text-xs px-3 py-1"
              :disabled="isLoadingStorage"
            >
              {{ isLoadingStorage ? 'Loading...' : 'Refresh Storage Info' }}
            </button>
            <button
              @click="debugStorage"
              class="text-blue-300 hover:text-blue-200 text-xs px-3 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
            >
              Debug Storage
            </button>
            <button
              @click="testTransmitterFetch"
              class="text-green-300 hover:text-green-200 text-xs px-3 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
            >
              Test Transmitter Fetch
            </button>
            <button
              @click="clearAllData"
              class="text-red-300 hover:text-red-200 text-xs px-3 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional Settings -->
    <div class="max-w-lg mx-auto mb-6">
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-4 text-primary-400">Tracking Settings</h3>

        <div class="space-y-4">
          <!-- Update Interval -->
          <div>
            <label class="block text-xs font-medium text-space-300 mb-1">Update Interval</label>
            <select
              v-model="settings.updateInterval"
              class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="1000">1 second</option>
              <option value="2000">2 seconds</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
            </select>
          </div>

          <!-- Units -->
          <div>
            <label class="block text-xs font-medium text-space-300 mb-1">Distance Units</label>
            <select
              v-model="settings.distanceUnits"
              class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="km">Kilometers</option>
              <option value="miles">Miles</option>
            </select>
          </div>

          <!-- Compass Type -->
          <div>
            <label class="block text-xs font-medium text-space-300 mb-1">Compass Type</label>
            <select
              v-model="settings.compassType"
              class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="true">True North (GPS) - Recommended</option>
            </select>
            <div class="text-xs text-space-500 mt-1">
              Uses GPS heading for maximum accuracy
            </div>
          </div>

          <!-- Auto-update TLE -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-space-300">Auto-update TLE data</label>
            <input
              v-model="settings.autoUpdateTLE"
              type="checkbox"
              class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
            />
          </div>

          <!-- Sound alerts -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-space-300">Sound alerts</label>
            <input
              v-model="settings.soundAlerts"
              type="checkbox"
              class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
            />
          </div>

          <!-- High accuracy mode -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-space-300">High accuracy GPS</label>
            <input
              v-model="settings.highAccuracyGPS"
              type="checkbox"
              class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
            />
          </div>

          <!-- Magnetometer calibration -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-space-300">Auto-calibrate compass</label>
            <input
              v-model="settings.autoCalibrateCompass"
              type="checkbox"
              class="w-4 h-4 text-primary-600 bg-space-800 border-space-700 rounded focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Combined Data Display -->
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
          >
            <!-- Clickable Header -->
            <div
              @click="toggleSatelliteData(noradId)"
              class="flex items-center justify-between mb-2 cursor-pointer hover:bg-space-800 rounded p-2 transition-all duration-300 ease-in-out hover:scale-[1.01] group"
            >
              <div class="flex items-center gap-2">
                <h4 class="font-semibold text-primary-300 group-hover:text-primary-200 transition-colors duration-300 ease-in-out">{{ data.satellite?.name || `NORAD ${noradId}` }}</h4>
                <span class="text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out">NORAD ID: {{ noradId }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out">{{ data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown' }}</span>
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
              <!-- Orbital Parameters Box -->
              <div v-if="getTLEData(parseInt(noradId))" class="mb-3">
                <div class="text-sm text-space-300 mb-2">🛰️ Orbital Parameters (TLE)</div>
                <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                  <div class="text-xs text-space-400 space-y-1 font-mono">
                    <div v-if="getTLEData(parseInt(noradId)).tle0" class="break-all">{{ getTLEData(parseInt(noradId)).tle0 }}</div>
                    <div v-if="getTLEData(parseInt(noradId)).tle1" class="break-all">{{ getTLEData(parseInt(noradId)).tle1 }}</div>
                    <div v-if="getTLEData(parseInt(noradId)).tle2" class="break-all">{{ getTLEData(parseInt(noradId)).tle2 }}</div>
                  </div>
                </div>
              </div>

              <!-- Debug: Show TLE data status -->
              <div v-else class="mb-3 text-xs text-yellow-400">
                🔍 Debug: No TLE data found for NORAD {{ noradId }}
                <div class="text-space-400 mt-1">
                  Available TLE data: {{ Object.keys(getAllTLEData()).join(', ') || 'None' }}
                </div>
              </div>

              <!-- Transmitter Data -->
              <div v-if="data.transmitters && data.transmitters.length > 0">
                <div class="text-sm text-space-300 mb-2">📻 Transmitter Data ({{ data.transmitters.length }} transmitters)</div>
                <div class="space-y-2">
                <div
                  v-for="(transmitter, index) in data.transmitters"
                  :key="index"
                  class="bg-space-800 border border-space-500 rounded p-2 text-xs"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold text-primary-200">{{ transmitter.description || 'Unknown' }}</span>
                    <span class="text-space-400">{{ transmitter.type }}</span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-space-300">
                    <div v-if="transmitter.uplink_low">
                      <span class="text-space-400">Uplink:</span> {{ formatFrequency(transmitter.uplink_low) }}
                      <span v-if="transmitter.uplink_high"> - {{ formatFrequency(transmitter.uplink_high) }}</span>
                    </div>
                    <div v-if="transmitter.downlink_low">
                      <span class="text-space-400">Downlink:</span> {{ formatFrequency(transmitter.downlink_low) }}
                      <span v-if="transmitter.downlink_high"> - {{ formatFrequency(transmitter.downlink_high) }}</span>
                    </div>
                    <div v-if="transmitter.mode">
                      <span class="text-space-400">Mode:</span> {{ transmitter.mode }}
                    </div>
                    <div v-if="transmitter.baud">
                      <span class="text-space-400">Baud:</span> {{ transmitter.baud }}
                    </div>
                    <div v-if="transmitter.service">
                      <span class="text-space-400">Service:</span> {{ transmitter.service }}
                    </div>
                    <div>
                      <span class="text-space-400">Status:</span>
                      <span :class="transmitter.status === 'active' ? 'text-green-400' : 'text-red-400'">
                        {{ transmitter.status }}
                      </span>
                    </div>
                  </div>

                  <div v-if="transmitter.alive !== null" class="mt-1">
                    <span class="text-space-400">Alive:</span>
                    <span :class="transmitter.alive ? 'text-green-400' : 'text-red-400'">
                      {{ transmitter.alive ? 'Yes' : 'No' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

              <div v-else class="text-sm text-space-400 italic">No transmitter data available</div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="max-w-lg mx-auto">
      <button
        @click="saveSettings"
        class="btn-primary w-full mb-4"
      >
        Save Settings
      </button>

      <button
        @click="goBack"
        class="btn-secondary w-full"
      >
        Back to Tracker
      </button>
    </div>
  </div>
</template>

<script setup>
import spaceTrackAPI from '~/utils/spaceTrackApi.js'
import { useTLEData } from '~/composables/useTLEData.js'
import { useSatelliteSearch } from '~/composables/useSatelliteSearch.js'
import secureStorage from '~/utils/secureStorage.js'
import indexedDBStorage from '~/utils/indexedDBStorage.js'

// Composables
const { fetchTLEData, isLoading: tleLoading, error: tleError, refreshTLEData, getDataFreshness, initializeTLEData, getTLEData, getAllTLEData } = useTLEData()
const {
  isLoading: searchLoading,
  error: searchError,
  searchResults,
  searchQuery,
  debouncedSearch,
  clearSearch,
  formatSatellite,
  isNoradId
} = useSatelliteSearch()

// Settings data
const settings = ref({
  spaceTrackUsername: '',
  spaceTrackPassword: '',
  satnogsToken: '',
  trackedSatellites: [],
  updateInterval: 5000,
  distanceUnits: 'km',
  compassType: 'true',
  autoUpdateTLE: true,
  soundAlerts: false,
  highAccuracyGPS: true,
  autoCalibrateCompass: true
})


const spaceTrackStatus = ref(false)
const isTestingConnection = ref(false)
const connectionMessage = ref('')
const credentialsLoaded = ref(false)
const tleDataStatus = ref('')
const storageInfo = ref({})
const isSavingSettings = ref(false)

// SatNOGS status variables
const satnogsStatus = ref(false)
const isTestingSatnogs = ref(false)
const isTestingCombined = ref(false)
const satnogsMessage = ref('')
const combinedData = ref(null)
const isLoadingStorage = ref(false)
const expandedSatellites = ref(new Set())

// Fetch status for UI display - separate for each API
const spaceTrackFetchStatus = ref({
  show: false,
  type: 'info',
  message: '',
  details: '',
  progress: ''
})

const satnogsFetchStatus = ref({
  show: false,
  type: 'info',
  message: '',
  details: '',
  progress: ''
})

// Load settings from secure storage
const loadSettings = async () => {
  try {
    isLoadingSettings.value = true

    // Load general settings
    const savedSettings = await secureStorage.getSettings()
    if (savedSettings) {
      // Merge saved settings into current settings, preserving the structure
      Object.keys(savedSettings).forEach(key => {
        if (savedSettings[key] !== undefined && savedSettings[key] !== null) {
          settings.value[key] = savedSettings[key]
        }
      })
    }

    // Load encrypted credentials (including SatNOGS token)
    const credentials = await secureStorage.getCredentials()
    if (credentials) {
      settings.value.spaceTrackUsername = credentials.username || ''
      settings.value.spaceTrackPassword = credentials.password || ''
      // Only overwrite satnogsToken if it exists in credentials, otherwise keep from general settings
      if (credentials.satnogsToken) {
        settings.value.satnogsToken = credentials.satnogsToken
      }
      credentialsLoaded.value = true
    }

    // Update connection status based on loaded credentials
    await updateConnectionStatus()

    // Load stored transponder data
    await loadStoredTransponderData()

    // Load stored transmitter data
    await loadStoredTransmitterData()

    // Initialize TLE data from cache
    await initializeTLEData(
      settings.value.trackedSatellites,
      settings.value.spaceTrackUsername,
      settings.value.spaceTrackPassword
    )

    // Check TLE data status
    updateTLEStatus()

    // Load storage info
    await loadStorageInfo()

  } catch (error) {
    console.error('Failed to load settings:', error)
  } finally {
    isLoadingSettings.value = false
  }
}

// Update connection status based on loaded credentials
const updateConnectionStatus = async () => {
  try {
    // Update Space-Track.org status
    if (settings.value.spaceTrackUsername && settings.value.spaceTrackPassword) {
      spaceTrackStatus.value = true
      connectionMessage.value = 'Credentials loaded'
    } else {
      spaceTrackStatus.value = false
      connectionMessage.value = 'No credentials'
    }

    // Update SatNOGS status
    if (settings.value.satnogsToken) {
      satnogsStatus.value = true
      satnogsMessage.value = 'Token loaded'
    } else {
      satnogsStatus.value = false
      satnogsMessage.value = 'No token'
    }
  } catch (error) {
    console.error('Failed to update connection status:', error)
  }
}

// Load stored transponder data from IndexedDB
const loadStoredTransponderData = async () => {
  try {
    // Check if we have any stored transponder data
    const storedData = await indexedDBStorage.getAllTransponderData()
    if (storedData && storedData.length > 0) {
      // Convert array to object keyed by NORAD ID
      const transponderData = {}
      storedData.forEach(item => {
        transponderData[item.noradId] = item.data
      })

      combinedData.value = transponderData
      console.log(`Loaded stored transponder data for ${Object.keys(transponderData).length} satellites`)

      // Update SatNOGS status to show we have cached data
      if (satnogsStatus.value) {
        satnogsMessage.value = `Token loaded (${Object.keys(transponderData).length} satellites cached)`
      }
    }
  } catch (error) {
    console.log('No stored transponder data found or error loading:', error.message)
  }
}

// Load stored transmitter data from IndexedDB
const loadStoredTransmitterData = async () => {
  try {
    // Check if we have any stored transmitter data
    const storedData = await indexedDBStorage.getAllTransponderData()
    if (storedData && storedData.length > 0) {
      // Filter for transmitter data and convert array to object keyed by NORAD ID
      const transmitterData = {}
      storedData.forEach(item => {
        if (item.type === 'transmitter') {
          transmitterData[item.noradId] = item.data
        }
      })

      if (Object.keys(transmitterData).length > 0) {
        // Merge with existing combinedData, prioritizing transmitter data
        combinedData.value = { ...combinedData.value, ...transmitterData }
        console.log(`Loaded stored transmitter data for ${Object.keys(transmitterData).length} satellites`)

        // Update SatNOGS status to show we have cached transmitter data
        if (satnogsStatus.value) {
          satnogsMessage.value = `Token loaded (${Object.keys(transmitterData).length} transmitters cached)`
        }
      }
    }
  } catch (error) {
    console.log('No stored transmitter data found or error loading:', error.message)
  }
}

// Auto-save settings when they change
const autoSaveSettings = async () => {
  // Don't auto-save during initial loading
  if (isLoadingSettings.value) {
    return
  }

  try {
    // Save credentials if they exist
    if (settings.value.spaceTrackUsername && settings.value.spaceTrackPassword) {
      await secureStorage.storeCredentials({
        username: settings.value.spaceTrackUsername,
        password: settings.value.spaceTrackPassword,
        satnogsToken: settings.value.satnogsToken || ''
      })
    } else if (settings.value.satnogsToken) {
      // Save only SatNOGS token if no Space-Track credentials
      await secureStorage.storeCredentials({
        username: '',
        password: '',
        satnogsToken: settings.value.satnogsToken
      })
    }

    // Create a clean, serializable copy of settings for IndexedDB
    const cleanSettings = JSON.parse(JSON.stringify(settings.value))

    // Save general settings (including credentials in the main settings object)
    await secureStorage.storeSettings(cleanSettings)

  } catch (error) {
    console.error('Failed to auto-save settings:', error)
  }
}

// Watch for changes in settings and auto-save
watch(settings, () => {
  // Debounce auto-save to avoid too frequent saves
  clearTimeout(autoSaveTimeout.value)
  autoSaveTimeout.value = setTimeout(autoSaveSettings, 1000)
}, { deep: true })

// Auto-save timeout reference
const autoSaveTimeout = ref(null)

// Flag to prevent auto-save during initial loading
const isLoadingSettings = ref(false)

// Cleanup on unmount
onUnmounted(() => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
})

// Save settings to secure storage
const saveSettings = async () => {
  try {
    isSavingSettings.value = true

    // Save credentials securely
    if (settings.value.spaceTrackUsername && settings.value.spaceTrackPassword) {
      await secureStorage.storeCredentials({
        username: settings.value.spaceTrackUsername,
        password: settings.value.spaceTrackPassword,
        satnogsToken: settings.value.satnogsToken || ''
      })
    } else if (settings.value.satnogsToken) {
      // Save only SatNOGS token if no Space-Track credentials
      await secureStorage.storeCredentials({
        username: '',
        password: '',
        satnogsToken: settings.value.satnogsToken
      })
    }

    // Create a clean, serializable copy of settings for IndexedDB
    const cleanSettings = JSON.parse(JSON.stringify(settings.value))

    // Save general settings (without credentials)
    await secureStorage.storeSettings(cleanSettings)

    console.log('Settings saved securely')
    console.log('Settings saved successfully!')
  } catch (error) {
    console.error('Failed to save settings:', error)
    console.log('Failed to save settings. Please try again.')
  } finally {
    isSavingSettings.value = false
  }
}

// Update TLE data status display
const updateTLEStatus = () => {
  const freshness = getDataFreshness()
  if (freshness.isFresh) {
    tleDataStatus.value = `Fresh (${freshness.age} min ago)`
  } else if (freshness.age !== null) {
    tleDataStatus.value = `Stale (${freshness.age} min ago)`
  } else {
    tleDataStatus.value = 'No data'
  }
}

// Load storage information
const loadStorageInfo = async () => {
  isLoadingStorage.value = true
  try {
    // Force refresh by clearing any cached data
    storageInfo.value = {}

    // Get fresh storage info
    const freshInfo = await secureStorage.getStorageInfo()
    storageInfo.value = freshInfo

    console.log('Storage info loaded:', storageInfo.value)
    console.log('Our data breakdown:', storageInfo.value.indexedDB?.ourData)

    // Log the formatted sizes
    if (storageInfo.value.indexedDB?.ourData) {
      console.log('Formatted sizes:', {
        total: storageInfo.value.indexedDB.ourData.total,
        tle: storageInfo.value.indexedDB.ourData.tle,
        settings: storageInfo.value.indexedDB.ourData.settings,
        credentials: storageInfo.value.indexedDB.ourData.credentials
      })
    }
  } catch (error) {
    console.error('Failed to load storage info:', error)
    storageInfo.value = { error: 'Failed to load storage info' }
  } finally {
    isLoadingStorage.value = false
  }
}

// Debug storage information
const debugStorage = async () => {
  try {
    console.log('=== Storage Debug Info ===')

    // Check IndexedDB directly
    const indexedDBInfo = await indexedDBStorage.getStorageInfo()
    console.log('IndexedDB Info:', indexedDBInfo)

    // Check if we have TLE data
    const tleData = await indexedDBStorage.getTLEData()
    console.log('TLE Data exists:', !!tleData)
    if (tleData) {
      console.log('TLE Data count:', Object.keys(tleData.data || {}).length)
      console.log('TLE Data sample:', Object.keys(tleData.data || {}).slice(0, 3))
    }

    // Check credentials
    const credentials = await indexedDBStorage.getCredentials()
    console.log('Credentials exist:', !!credentials)

    // Check settings
    const settings = await indexedDBStorage.getSettings()
    console.log('Settings exist:', Object.keys(settings).length > 0)
    console.log('Settings keys:', Object.keys(settings))

    // Check localStorage fallback
    console.log('localStorage keys:', Object.keys(localStorage).filter(key => key.startsWith('sattrack')))

    // Check transponder/transmitter data
    try {
      const transponderData = await indexedDBStorage.getAllTransponderData()
      console.log('Transponder/Transmitter Data exists:', !!transponderData)
      console.log('Transponder/Transmitter Data count:', transponderData?.length || 0)
      if (transponderData && transponderData.length > 0) {
        console.log('Transponder/Transmitter Data sample:', transponderData.slice(0, 3).map(item => ({
          noradId: item.noradId,
          type: item.type,
          timestamp: item.timestamp
        })))
      }
    } catch (error) {
      console.log('Transponder/Transmitter Data error:', error.message)
    }

    console.log('=== End Debug Info ===')
  } catch (error) {
    console.error('Debug storage failed:', error)
  }
}

// Test transmitter data fetch for debugging
const testTransmitterFetch = async () => {
  try {
    console.log('=== TESTING TRANSMITTER FETCH ===')
    console.log('SatNOGS Token:', settings.value.satnogsToken ? '[SET]' : '[NOT SET]')
    console.log('Tracked Satellites:', settings.value.trackedSatellites?.length || 0)

    if (!settings.value.satnogsToken) {
      console.log('❌ No SatNOGS token - cannot test')
      return
    }

    if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
      console.log('❌ No tracked satellites - cannot test')
      return
    }

    // Test with just the first satellite
    const testSatellite = settings.value.trackedSatellites[0]
    console.log('Testing with satellite:', testSatellite)

    const response = await $fetch('/api/satnogs', {
      method: 'POST',
      body: {
        token: settings.value.satnogsToken,
        action: 'transmitters',
        noradId: testSatellite.noradId
      }
    })

    console.log('API Response:', response)

    if (response.success) {
      console.log('✓ API call successful')
      console.log('Transmitters found:', response.data.length)
      console.log('Sample transmitter:', response.data[0])

      // Test storing this data
      const testData = {
        [testSatellite.noradId]: {
          satellite: testSatellite,
          transmitters: response.data,
          noradId: testSatellite.noradId,
          timestamp: new Date().toISOString()
        }
      }

      console.log('Testing storage with data:', testData)
      await indexedDBStorage.storeAllTransmitterData(testData)
      console.log('✓ Storage test completed')

      // Verify storage
      const storedData = await indexedDBStorage.getAllTransponderData()
      console.log('✓ Verification - stored data count:', storedData?.length || 0)

    } else {
      console.log('❌ API call failed:', response.message)
    }

    console.log('=== END TESTING TRANSMITTER FETCH ===')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Test Space-Track.org connection
const testSpaceTrackConnection = async () => {
  if (!settings.value.spaceTrackUsername || !settings.value.spaceTrackPassword) {
    console.log('Please enter both username and password')
    return
  }

  isTestingConnection.value = true
  connectionMessage.value = 'Testing connection...'

  try {
    const success = await spaceTrackAPI.testConnection(
      settings.value.spaceTrackUsername,
      settings.value.spaceTrackPassword
    )

        if (success) {
          spaceTrackStatus.value = true
          connectionMessage.value = 'Connection successful!'
          console.log('Space-Track.org connection successful!')
        } else {
          spaceTrackStatus.value = false
          connectionMessage.value = 'Connection failed'
          console.log('Space-Track.org connection failed. Please check your credentials.')
        }
  } catch (error) {
    spaceTrackStatus.value = false
    connectionMessage.value = 'Connection error'
    console.log(`Connection test failed: ${error.message}. Please check your credentials.`)
  } finally {
    isTestingConnection.value = false
  }
}

// Format frequency from Hz to MHz/kHz
const formatFrequency = (freqHz) => {
  if (!freqHz) return 'N/A'

  if (freqHz >= 1000000) {
    return `${(freqHz / 1000000).toFixed(3)} MHz`
  } else if (freqHz >= 1000) {
    return `${(freqHz / 1000).toFixed(1)} kHz`
  } else {
    return `${freqHz} Hz`
  }
}

// Fetch all data (TLE + Transponder) in one operation
const fetchAllData = async () => {
  try {
    console.log('Starting combined data fetch...')

    // Check if we have any credentials
    if (!settings.value.spaceTrackUsername || !settings.value.spaceTrackPassword) {
      if (!settings.value.satnogsToken) {
        spaceTrackFetchStatus.value = {
          show: true,
          type: 'warning',
          message: 'No credentials provided',
          details: 'Please enter Space-Track.org credentials or SatNOGS API token',
          progress: ''
        }
        satnogsFetchStatus.value = {
          show: true,
          type: 'warning',
          message: 'No credentials provided',
          details: 'Please enter Space-Track.org credentials or SatNOGS API token',
          progress: ''
        }
        return
      }
    }

    console.log('Starting combined data fetch...')

    let tleSuccess = false
    let transponderSuccess = false

    // Fetch TLE data if Space-Track credentials are available
    if (settings.value.spaceTrackUsername && settings.value.spaceTrackPassword) {
      try {
        spaceTrackFetchStatus.value = {
          show: true,
          type: 'info',
          message: 'Fetching TLE data from Space-Track.org...',
          details: '',
          progress: ''
        }

        console.log('Fetching TLE data from Space-Track.org...')
        await fetchTLEData(
          settings.value.trackedSatellites,
          settings.value.spaceTrackUsername,
          settings.value.spaceTrackPassword,
          settings.value.satnogsToken
        )
        updateTLEStatus()
        tleSuccess = true
        console.log('TLE data fetch completed')
      } catch (error) {
        console.error('TLE data fetch failed:', error)
        spaceTrackFetchStatus.value = {
          show: true,
          type: 'warning',
          message: 'TLE data fetch failed',
          details: error.message,
          progress: ''
        }
      }
    }

    // Fetch transponder data if SatNOGS token is available
    if (settings.value.satnogsToken) {
      try {
        console.log('=== STARTING TRANSMITTER DATA FETCH ===')
        console.log('SatNOGS Token:', settings.value.satnogsToken ? '[SET]' : '[NOT SET]')
        console.log('Tracked Satellites Count:', settings.value.trackedSatellites?.length || 0)
        console.log('Tracked Satellites:', settings.value.trackedSatellites?.map(s => s.name) || [])

        satnogsFetchStatus.value = {
          show: true,
          type: 'info',
          message: 'Fetching transmitter data from SatNOGS...',
          details: 'Getting frequency information for tracked satellites',
          progress: 'Step 2/2: Transmitter Data'
        }

        console.log('Fetching transmitter data from SatNOGS...')
        await fetchTrackedSatellitesTransmitterData()
        transponderSuccess = true
        console.log('✓ Transmitter data fetch completed successfully')
        console.log('=== END TRANSMITTER DATA FETCH ===')
      } catch (error) {
        console.error('Transponder data fetch failed:', error)
        satnogsFetchStatus.value = {
          show: true,
          type: 'warning',
          message: 'Transponder data fetch failed',
          details: error.message,
          progress: ''
        }
      }
    }

    // Show final status
    if (tleSuccess) {
      spaceTrackFetchStatus.value = {
        show: true,
        type: 'success',
        message: 'Successfully fetched TLE data',
        details: '',
        progress: ''
      }
    }
    if (transponderSuccess) {
      satnogsFetchStatus.value = {
        show: true,
        type: 'success',
        message: 'Successfully fetched transmitter data',
        details: 'Loaded frequency information for tracked satellites',
        progress: 'Transmitter Data Complete'
      }
    }

    console.log('Combined data fetch completed')

  } catch (error) {
    console.error('Combined data fetch error:', error)
    spaceTrackFetchStatus.value = {
      show: true,
      type: 'error',
      message: 'Data fetch error',
      details: error.message,
      progress: ''
    }
    satnogsFetchStatus.value = {
      show: true,
      type: 'error',
      message: 'Data fetch error',
      details: error.message,
      progress: ''
    }
  }
}

// Test SatNOGS connection
const testSatnogsConnection = async () => {
  if (!settings.value.satnogsToken) {
    console.log('Please enter SatNOGS API token')
    return
  }

  isTestingSatnogs.value = true
  satnogsMessage.value = 'Testing connection...'

  try {
    console.log('Testing SatNOGS API with token:', settings.value.satnogsToken.substring(0, 8) + '...')

    // Use our server-side API endpoint to avoid CORS issues
    const response = await $fetch('/api/satnogs', {
      method: 'POST',
      body: {
        token: settings.value.satnogsToken,
        action: 'test'
      }
    })

    console.log('SatNOGS API response:', response)

    if (response.success) {
      satnogsStatus.value = true
      satnogsMessage.value = 'Connection successful!'
      const satelliteCount = Array.isArray(response.data) ? response.data.length : 0
      console.log(`SatNOGS API authentication successful! Found ${satelliteCount} satellite(s).`)
    } else {
      satnogsStatus.value = false
      satnogsMessage.value = 'Connection failed'
      console.log('SatNOGS API connection failed. Please check your token.')
    }
  } catch (error) {
    satnogsStatus.value = false
    satnogsMessage.value = 'Connection error'
    console.error('SatNOGS connection test error:', error)
    console.log(`SatNOGS API connection test failed: ${error.message}. Please check your token and internet connection.`)
  } finally {
    isTestingSatnogs.value = false
  }
}

// Fetch transponder data for all tracked satellites
const fetchTrackedSatellitesTransponderData = async () => {
  if (!settings.value.satnogsToken) {
    console.log('Please enter SatNOGS API token')
    return
  }

  if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
    console.log('No satellites are being tracked. Add satellites first.')
    return
  }

  isTestingCombined.value = true
  satnogsMessage.value = 'Loading transponder data for tracked satellites...'

  try {
    console.log('Fetching transponder data for tracked satellites:', settings.value.trackedSatellites.map(s => s.noradId))

    const transponderData = {}
    let successCount = 0
    let errorCount = 0

    // Fetch transponder data for each tracked satellite
    for (const satellite of settings.value.trackedSatellites) {
      try {
        // Update progress in UI
        satnogsFetchStatus.value = {
          show: true,
          type: 'info',
          message: 'Fetching transponder data from SatNOGS...',
          details: `Processing ${satellite.name} (${satellite.noradId})`,
          progress: `${successCount + errorCount + 1}/${settings.value.trackedSatellites.length} satellites`
        }

        console.log(`Fetching transponder data for ${satellite.name} (NORAD: ${satellite.noradId})`)

        const response = await $fetch('/api/satnogs', {
          method: 'POST',
          body: {
            token: settings.value.satnogsToken,
            action: 'combined-data',
            noradId: satellite.noradId
          }
        })

        if (response.success) {
          transponderData[satellite.noradId] = response.data
          successCount++
          console.log(`✓ Found ${response.data.transmitters.length} transmitters for ${satellite.name}`)
        } else {
          errorCount++
          console.log(`✗ No transponder data found for ${satellite.name}`)
        }
      } catch (error) {
        errorCount++
        console.log(`✗ Error fetching data for ${satellite.name}:`, error.message)
      }
    }

    // Store the transponder data
    combinedData.value = transponderData

    // Ensure all satellite cards start collapsed
    collapseAllSatellites()

    // Update status message
    if (successCount > 0) {
      satnogsMessage.value = `Loaded transponder data for ${successCount} satellites`
      console.log(`Transponder data loaded! Found data for ${successCount} out of ${settings.value.trackedSatellites.length} tracked satellites.`)
    } else {
      satnogsMessage.value = 'No transponder data found'
      console.log('No transponder data found for any tracked satellites.')
    }

    if (errorCount > 0) {
      console.log(`Note: ${errorCount} satellites had no transponder data or errors`)
    }

  } catch (error) {
    satnogsMessage.value = 'Transponder data error'
    console.error('Tracked satellites transponder data error:', error)
    console.log('Failed to load transponder data. Please check your token and try again.')
  } finally {
    isTestingCombined.value = false
  }
}

// Fetch transmitter data for tracked satellites using the new transmitter API
const fetchTrackedSatellitesTransmitterData = async () => {
  console.log('=== fetchTrackedSatellitesTransmitterData START ===')

  if (!settings.value.satnogsToken) {
    console.log('❌ No SatNOGS token - cannot fetch transmitter data')
    return
  }

  if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
    console.log('❌ No tracked satellites - cannot fetch transmitter data')
    return
  }

  console.log('✓ SatNOGS token available')
  console.log('✓ Tracked satellites available:', settings.value.trackedSatellites.length)

  isTestingCombined.value = true
  satnogsMessage.value = 'Loading transmitter data for tracked satellites...'

  try {
    console.log('Fetching transmitter data for tracked satellites:', settings.value.trackedSatellites.map(s => s.noradId))

    const transmitterData = {}
    let successCount = 0
    let errorCount = 0

    // Fetch transmitter data for each tracked satellite
    for (const satellite of settings.value.trackedSatellites) {
      try {
        // Update progress in UI
        satnogsFetchStatus.value = {
          show: true,
          type: 'info',
          message: 'Fetching transmitter data from SatNOGS...',
          details: `Processing ${satellite.name} (${satellite.noradId})`,
          progress: `${successCount + errorCount + 1}/${settings.value.trackedSatellites.length} satellites`
        }

        console.log(`Fetching transmitter data for ${satellite.name} (NORAD: ${satellite.noradId})`)

        const response = await $fetch('/api/satnogs', {
          method: 'POST',
          body: {
            token: settings.value.satnogsToken,
            action: 'transmitters',
            noradId: satellite.noradId
          }
        })

        if (response.success) {
          transmitterData[satellite.noradId] = {
            satellite: satellite,
            transmitters: response.data,
            noradId: satellite.noradId,
            timestamp: new Date().toISOString()
          }
          successCount++
          console.log(`✓ Found ${response.data.length} transmitters for ${satellite.name}`)
        } else {
          errorCount++
          console.log(`✗ No transmitter data found for ${satellite.name}`)
        }
      } catch (error) {
        errorCount++
        console.log(`✗ Error fetching data for ${satellite.name}:`, error.message)
      }
    }

    // Store the transmitter data
    combinedData.value = transmitterData

    // Ensure all satellite cards start collapsed
    collapseAllSatellites()

    // Store in IndexedDB for persistence
    if (Object.keys(transmitterData).length > 0) {
      try {
        console.log('=== STORING TRANSMITTER DATA ===')
        console.log('Transmitter data to store:', Object.keys(transmitterData))
        console.log('Sample data structure:', transmitterData[Object.keys(transmitterData)[0]])

        // Create a clean, serializable copy of transmitter data for IndexedDB
        const cleanTransmitterData = JSON.parse(JSON.stringify(transmitterData))
        console.log('Clean transmitter data created:', Object.keys(cleanTransmitterData))

        await indexedDBStorage.storeAllTransmitterData(cleanTransmitterData)
        console.log('✓ Transmitter data stored successfully in IndexedDB')

        // Verify storage by reading it back
        const storedData = await indexedDBStorage.getAllTransponderData()
        console.log('✓ Verification - stored data count:', storedData?.length || 0)
        console.log('=== END STORING TRANSMITTER DATA ===')
      } catch (error) {
        console.error('✗ Failed to store transmitter data in IndexedDB:', error)
      }
    } else {
      console.log('No transmitter data to store')
    }

    // Update status message
    if (successCount > 0) {
      satnogsMessage.value = `Loaded transmitter data for ${successCount} satellites`
      console.log(`Transmitter data loaded! Found data for ${successCount} out of ${settings.value.trackedSatellites.length} tracked satellites.`)
    } else {
      satnogsMessage.value = 'No transmitter data found'
      console.log('No transmitter data found for any tracked satellites.')
    }

    if (errorCount > 0) {
      console.log(`Note: ${errorCount} satellites had no transmitter data or errors`)
    }

  } catch (error) {
    satnogsMessage.value = 'Transmitter data error'
    console.error('Tracked satellites transmitter data error:', error)
    console.log('Failed to load transmitter data. Please check your token and try again.')
  } finally {
    isTestingCombined.value = false
  }
}

    // Fetch TLE data for all tracked satellites
    const fetchAllTLEData = async () => {
      try {
        if (!settings.value.spaceTrackUsername || !settings.value.spaceTrackPassword) {
          console.log('Please enter Space-Track.org credentials first')
          return
        }

        await fetchTLEData(
          settings.value.trackedSatellites,
          settings.value.spaceTrackUsername,
          settings.value.spaceTrackPassword,
          settings.value.satnogsToken
        )

        updateTLEStatus()

        // Wait a moment for IndexedDB write to complete, then refresh storage info
        setTimeout(async () => {
          await loadStorageInfo()
        }, 500)

        if (tleError.value) {
          console.log(`TLE data fetch failed: ${tleError.value}`)
        } else {
          console.log('TLE data updated successfully!')
        }
      } catch (error) {
        console.log(`TLE data fetch error: ${error.message}`)
      }
    }

    // Force refresh TLE data
    const forceRefreshTLEData = async () => {
      try {
        if (!settings.value.spaceTrackUsername || !settings.value.spaceTrackPassword) {
          alert('Please enter Space-Track.org credentials first')
          return
        }

        await refreshTLEData(
          settings.value.trackedSatellites,
          settings.value.spaceTrackUsername,
          settings.value.spaceTrackPassword,
          settings.value.satnogsToken
        )

        updateTLEStatus()
        alert('TLE data refreshed successfully!')
      } catch (error) {
        alert(`TLE data refresh error: ${error.message}`)
      }
    }

    // Clear all stored data
    const clearAllData = async () => {
      if (confirm('This will clear all satellite data (tracked satellites, TLE data, transmitter data). Credentials and settings will be preserved. Are you sure?')) {
        try {
          // Clear tracked satellites list first
          settings.value.trackedSatellites = []

          // Clear all satellite data from database (only TLE and transponder stores)
          await Promise.all([
            indexedDBStorage.clearTLEData(),
            indexedDBStorage.clearTransponderData()
          ])

          // Clear combined data display
          combinedData.value = []

          // Clear status messages
          spaceTrackFetchStatus.value = ''
          satnogsFetchStatus.value = ''

          // Update TLE status
          tleDataStatus.value = 'No data'

          // Save the updated settings (with empty tracked satellites) to preserve credentials
          const cleanSettings = JSON.parse(JSON.stringify(settings.value))
          await secureStorage.storeSettings(cleanSettings)

          // Reload storage info to reflect cleared data
          await loadStorageInfo()

          console.log('All satellite data cleared successfully')
          alert('All satellite data cleared successfully!')
        } catch (error) {
          console.error('Failed to clear satellite data:', error)
          alert('Failed to clear satellite data. Please try again.')
        }
      }
    }

// Add satellite
const addSatellite = (satellite) => {
  // Check if satellite is already tracked
  const exists = settings.value.trackedSatellites.some(sat => sat.noradId === satellite.noradId)
  if (!exists) {
    settings.value.trackedSatellites.push({
      noradId: satellite.noradId,
      name: satellite.name,
      names: satellite.names || '',
      status: satellite.status,
      operator: satellite.operator || 'Unknown',
      countries: satellite.countries || '',
      launched: satellite.launched,
      website: satellite.website || '',
      image: satellite.image || '',
      satId: satellite.satId
    })
    // Clear search after adding
    clearSearch()
  }
}

// Toggle satellite data visibility
const toggleSatelliteData = (noradId) => {
  if (expandedSatellites.value.has(noradId)) {
    expandedSatellites.value.delete(noradId)
  } else {
    expandedSatellites.value.add(noradId)
  }
}

// Check if satellite data is expanded
const isSatelliteExpanded = (noradId) => {
  return expandedSatellites.value.has(noradId)
}

// Collapse all satellite data
const collapseAllSatellites = () => {
  expandedSatellites.value.clear()
}

// Remove satellite
const removeSatellite = async (noradId) => {
  try {
    // Remove from tracked satellites list
    settings.value.trackedSatellites = settings.value.trackedSatellites.filter(
      sat => sat.noradId !== noradId
    )

    // Remove from combined data display
    if (combinedData.value && combinedData.value[noradId]) {
      delete combinedData.value[noradId]
    }

    // Remove from expanded satellites if it was expanded
    expandedSatellites.value.delete(noradId)

    // Clean up all associated data from database
    await Promise.all([
      indexedDBStorage.clearTLEDataForSatellite(noradId),
      indexedDBStorage.clearTransponderDataForSatellite(noradId)
    ])

    console.log(`Satellite ${noradId} and all its data removed successfully`)
  } catch (error) {
    console.error(`Failed to remove satellite ${noradId} data:`, error)
  }
}

// Navigation
const goBack = () => {
  navigateTo('/')
}

onMounted(async () => {
  await loadSettings()
})

// SEO
useHead({
  title: 'Settings - SatTrack',
  meta: [
    { name: 'description', content: 'Configure SatTrack settings and satellite tracking' }
  ]
})
</script>

<style scoped>
/* Additional styles if needed */
</style>
