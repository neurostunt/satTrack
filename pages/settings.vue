<template>
  <div class="min-h-screen space-gradient p-4">
    <!-- Header -->
    <header class="text-center mb-6">
      <h1 class="text-2xl font-bold mb-1 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
        ⚙️ Settings
      </h1>
      <p class="text-space-300 text-sm">Configure SatTrack</p>
    </header>

    <!-- Space-Track.org Login -->
    <div class="max-w-lg mx-auto mb-6">
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-4 text-primary-400">Space-Track.org API</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-space-300 mb-1">Username</label>
            <input 
              v-model="settings.spaceTrackUsername"
              type="text"
              class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
              placeholder="Enter Space-Track username"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-space-300 mb-1">Password</label>
            <input 
              v-model="settings.spaceTrackPassword"
              type="password"
              class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
              placeholder="Enter Space-Track password"
            />
          </div>
          <div class="flex items-center justify-between">
            <div class="text-xs text-space-400">
              Status: 
              <span :class="spaceTrackStatus ? 'text-green-400' : 'text-orange-400'">
                {{ spaceTrackStatus ? 'Connected' : 'Not connected' }}
              </span>
              <div v-if="connectionMessage" class="text-xs text-space-500 mt-1">
                {{ connectionMessage }}
              </div>
            </div>
            <div class="flex gap-2">
              <button 
                @click="testSpaceTrackConnection"
                class="btn-primary text-xs px-3 py-1"
                :disabled="!settings.spaceTrackUsername || !settings.spaceTrackPassword || isTestingConnection"
              >
                {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
              </button>
              <button 
                @click="fetchAllTLEData"
                class="btn-secondary text-xs px-3 py-1"
                :disabled="!spaceTrackStatus || tleLoading"
              >
                {{ tleLoading ? 'Fetching...' : 'Fetch TLE' }}
              </button>
            </div>
          </div>
          
          <!-- TLE Data Status -->
          <div v-if="credentialsLoaded" class="mt-3 p-2 bg-space-800 border border-space-700 rounded text-xs">
            <div class="flex items-center justify-between">
              <span class="text-space-300">TLE Data Status:</span>
              <span :class="{
                'text-green-400': tleDataStatus.includes('Fresh'),
                'text-yellow-400': tleDataStatus.includes('Stale'),
                'text-red-400': tleDataStatus === 'No data'
              }">
                {{ tleDataStatus }}
              </span>
            </div>
            <div class="flex gap-2 mt-2">
              <button 
                @click="forceRefreshTLEData"
                class="btn-secondary text-xs px-2 py-1"
                :disabled="tleLoading"
              >
                Force Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Satellite Management -->
    <div class="max-w-lg mx-auto mb-6">
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-4 text-primary-400">Tracked Satellites</h3>
        
        <!-- Add New Satellite -->
        <div class="mb-4">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-space-300 mb-1">NORAD ID</label>
              <input 
                v-model="newSatellite.noradId"
                type="number"
                class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
                placeholder="e.g., 25544"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-space-300 mb-1">Name</label>
              <input 
                v-model="newSatellite.name"
                type="text"
                class="w-full bg-space-800 border border-space-700 rounded px-1 py-0.5 text-xs text-white focus:border-primary-500 focus:outline-none"
                placeholder="e.g., ISS"
              />
            </div>
          </div>
          <button 
            @click="addSatellite"
            class="btn-primary w-full mt-2 text-sm"
            :disabled="!newSatellite.noradId || !newSatellite.name"
          >
            Add Satellite
          </button>
        </div>

        <!-- Satellite List -->
        <div class="space-y-3">
          <div 
            v-for="satellite in settings.trackedSatellites" 
            :key="satellite.noradId"
            class="flex items-center justify-between bg-space-800 border border-space-700 rounded px-3 py-2"
          >
            <div>
              <div class="text-sm font-mono text-primary-400">{{ satellite.name }}</div>
              <div class="text-xs text-space-400">NORAD: {{ satellite.noradId }}</div>
            </div>
            <button 
              @click="removeSatellite(satellite.noradId)"
              class="text-red-300 hover:text-red-200 text-xs px-2 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
            >
              Remove
            </button>
          </div>
          
          <div v-if="settings.trackedSatellites.length === 0" class="text-center text-space-400 text-sm py-4">
            No satellites added yet
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
import secureStorage from '~/utils/secureStorage.js'
import indexedDBStorage from '~/utils/indexedDBStorage.js'

// Composables
const { fetchTLEData, isLoading: tleLoading, error: tleError, refreshTLEData, getDataFreshness } = useTLEData()

// Settings data
const settings = ref({
  spaceTrackUsername: '',
  spaceTrackPassword: '',
  trackedSatellites: [
    { noradId: 25544, name: 'ISS' },
    { noradId: 43017, name: 'NOAA-15' },
    { noradId: 43770, name: 'NOAA-18' },
    { noradId: 43803, name: 'NOAA-19' },
    { noradId: 39444, name: 'NOAA-20' },
    { noradId: 40967, name: 'NOAA-21' },
    { noradId: 27607, name: 'NOAA-22' },
    { noradId: 24278, name: 'NOAA-23' },
    { noradId: 61781, name: 'NOAA-24' }
  ],
  updateInterval: 5000,
  distanceUnits: 'km',
  compassType: 'true',
  autoUpdateTLE: true,
  soundAlerts: false,
  highAccuracyGPS: true,
  autoCalibrateCompass: true
})

const newSatellite = ref({
  noradId: '',
  name: ''
})

const spaceTrackStatus = ref(false)
const isTestingConnection = ref(false)
const connectionMessage = ref('')
const credentialsLoaded = ref(false)
const tleDataStatus = ref('')
const storageInfo = ref({})
const isLoadingStorage = ref(false)

// Load settings from secure storage
const loadSettings = async () => {
  try {
    // Load general settings
    const savedSettings = secureStorage.getSettings()
    if (savedSettings) {
      settings.value = { ...settings.value, ...savedSettings }
    }

    // Load encrypted credentials
    const credentials = await secureStorage.getCredentials()
    if (credentials) {
      settings.value.spaceTrackUsername = credentials.username
      settings.value.spaceTrackPassword = credentials.password
      credentialsLoaded.value = true
      console.log('Credentials loaded securely')
    }

    // Check TLE data status
    updateTLEStatus()
    
    // Load storage info
    await loadStorageInfo()
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

// Save settings to secure storage
const saveSettings = async () => {
  try {
    // Save credentials securely
    if (settings.value.spaceTrackUsername && settings.value.spaceTrackPassword) {
      await secureStorage.storeCredentials({
        username: settings.value.spaceTrackUsername,
        password: settings.value.spaceTrackPassword
      })
    }

    // Save general settings (without credentials)
    secureStorage.storeSettings(settings.value)
    
    console.log('Settings saved securely')
    alert('Settings saved successfully!')
  } catch (error) {
    console.error('Failed to save settings:', error)
    alert('Failed to save settings. Please try again.')
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
    
    // Manual size calculation
    if (tleData) {
      const tleSize = new Blob([JSON.stringify(tleData)]).size
      console.log('Manual TLE size calculation:', tleSize, 'bytes')
    }
    
    console.log('=== End Debug Info ===')
  } catch (error) {
    console.error('Debug storage failed:', error)
  }
}

// Test Space-Track.org connection
const testSpaceTrackConnection = async () => {
  if (!settings.value.spaceTrackUsername || !settings.value.spaceTrackPassword) {
    alert('Please enter both username and password')
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
          alert('Space-Track.org connection successful!')
        } else {
          spaceTrackStatus.value = false
          connectionMessage.value = 'Connection failed'
          alert('Space-Track.org connection failed. Please check your credentials.')
        }
  } catch (error) {
    spaceTrackStatus.value = false
    connectionMessage.value = 'Connection error'
    alert(`Connection test failed: ${error.message}. Please check your credentials.`)
  } finally {
    isTestingConnection.value = false
  }
}

    // Fetch TLE data for all tracked satellites
    const fetchAllTLEData = async () => {
      try {
        if (!settings.value.spaceTrackUsername || !settings.value.spaceTrackPassword) {
          alert('Please enter Space-Track.org credentials first')
          return
        }

        await fetchTLEData(
          settings.value.trackedSatellites,
          settings.value.spaceTrackUsername,
          settings.value.spaceTrackPassword
        )
        
        updateTLEStatus()
        
        // Wait a moment for IndexedDB write to complete, then refresh storage info
        setTimeout(async () => {
          await loadStorageInfo()
        }, 500)
        
        if (tleError.value) {
          alert(`TLE data fetch failed: ${tleError.value}`)
        } else {
          alert('TLE data updated successfully!')
        }
      } catch (error) {
        alert(`TLE data fetch error: ${error.message}`)
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
          settings.value.spaceTrackPassword
        )
        
        updateTLEStatus()
        alert('TLE data refreshed successfully!')
      } catch (error) {
        alert(`TLE data refresh error: ${error.message}`)
      }
    }

    // Clear all stored data
    const clearAllData = async () => {
      if (confirm('This will clear all stored credentials and TLE data. Are you sure?')) {
        try {
          secureStorage.clearCredentials()
          secureStorage.clearTLECache()
          settings.value.spaceTrackUsername = ''
          settings.value.spaceTrackPassword = ''
          credentialsLoaded.value = false
          tleDataStatus.value = 'No data'
          alert('All data cleared successfully!')
        } catch (error) {
          console.error('Failed to clear data:', error)
          alert('Failed to clear data. Please try again.')
        }
      }
    }

// Add satellite
const addSatellite = () => {
  if (newSatellite.value.noradId && newSatellite.value.name) {
    settings.value.trackedSatellites.push({
      noradId: parseInt(newSatellite.value.noradId),
      name: newSatellite.value.name
    })
    newSatellite.value = { noradId: '', name: '' }
  }
}

// Remove satellite
const removeSatellite = (noradId) => {
  settings.value.trackedSatellites = settings.value.trackedSatellites.filter(
    sat => sat.noradId !== noradId
  )
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
