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

// Composables
const { fetchTLEData, isLoading: tleLoading, error: tleError } = useTLEData()

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

// Load settings from localStorage
const loadSettings = () => {
  const savedSettings = localStorage.getItem('sattrack-settings')
  if (savedSettings) {
    const parsed = JSON.parse(savedSettings)
    settings.value = { ...settings.value, ...parsed }
  }
}

// Save settings to localStorage
const saveSettings = () => {
  localStorage.setItem('sattrack-settings', JSON.stringify(settings.value))
  // Show success message
  alert('Settings saved successfully!')
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
        
        if (tleError.value) {
          alert(`TLE data fetch failed: ${tleError.value}`)
        } else {
          alert('TLE data updated successfully!')
        }
      } catch (error) {
        alert(`TLE data fetch error: ${error.message}`)
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

onMounted(() => {
  loadSettings()
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
