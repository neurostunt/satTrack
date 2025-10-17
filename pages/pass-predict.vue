<template>
  <NuxtLayout name="default" title="🛰️ Pass Predict" subtitle="Satellite Pass Prediction">
    <!-- Observation Location -->
    <ObservationLocation
      :latitude="settings.observationLocation?.latitude || 0"
      :longitude="settings.observationLocation?.longitude || 0"
      :altitude="settings.observationLocation?.altitude || 0"
      :grid-square="settings.gridSquare || ''"
    />

    <!-- Pass Prediction Data -->
    <div v-if="combinedData && Object.keys(combinedData).length > 0" class="max-w-lg mx-auto mb-6">
      <div class="bg-space-800 border border-space-700 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
          🛰️ Pass Predictions
          <span class="ml-2 text-sm text-space-300">({{ sortedPasses.length }} upcoming passes)</span>
        </h3>

        <!-- Loading State -->
        <div v-if="isPassCalculating" class="text-center py-8">
          <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-space-300">Calculating pass predictions...</p>
        </div>

        <!-- No Passes -->
        <div v-else-if="sortedPasses.length === 0" class="text-center py-8">
          <p class="text-space-400">No upcoming passes found</p>
          <p class="text-space-500 text-sm mt-2">Make sure you have tracked satellites and TLE data</p>
        </div>

        <!-- Individual Pass Cards -->
        <div v-else class="space-y-4">
          <div
            v-for="pass in sortedPasses"
            :key="`${pass.noradId}-${pass.startTime}`"
            class="bg-space-900 border border-space-600 rounded p-3"
            :class="{ 
              'bg-space-800': isPassExpanded(pass.noradId, pass.startTime),
              'passing-card': getPassStatus(pass.startTime, pass.endTime, pass.noradId) === 'passing'
            }"
          >
            <!-- Clickable Header -->
            <div
              @click="togglePassData(pass.noradId, pass.startTime)"
              class="flex items-center justify-between mb-1 cursor-pointer rounded py-1 px-2 transition-all duration-300 ease-in-out hover:scale-[1.01] group"
              :class="[
                isPassExpanded(pass.noradId, pass.startTime) ? 'bg-space-800' : 'hover:bg-space-800',
                { 'passing-header': getPassStatus(pass.startTime, pass.endTime, pass.noradId) === 'passing' }
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
                  <!-- Second row: NORAD ID + time until pass -->
                  <div class="flex items-center gap-2 text-xs text-space-400 group-hover:text-space-300 transition-colors duration-300 ease-in-out -mt-2 pb-2">
                    <span>NORAD ID: {{ pass.noradId }}</span>
                    <span class="text-primary-400 font-medium">
                      {{ formatTimeUntilPass(pass.startTime, pass.endTime, pass.noradId) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="transform transition-transform duration-500 ease-in-out" :class="{ 'rotate-180': isPassExpanded(pass.noradId, pass.startTime) }">
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
                v-show="isPassExpanded(pass.noradId, pass.startTime)"
                class="overflow-hidden"
              >
                <!-- Pass Details -->
                <div class="mb-3">
                  <div class="text-sm text-space-300 mb-2">🛰️ Pass Details</div>
                  <div class="bg-space-800 border border-space-500 rounded p-2 text-xs space-y-2">
                    <div class="flex justify-between">
                      <span class="text-space-400">Start Time:</span>
                      <span class="text-space-200">{{ formatPassTime(pass.startTime) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">End Time:</span>
                      <span class="text-space-200">{{ formatPassTime(pass.endTime) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">Duration:</span>
                      <span class="text-space-200">{{ formatPassDuration(pass.duration) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">Max Elevation:</span>
                      <span class="text-green-400 font-medium">{{ Math.round(pass.maxElevation) }}°</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">Start Elevation:</span>
                      <span class="text-space-200">{{ Math.round(pass.startElevation) }}°</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">End Elevation:</span>
                      <span class="text-space-200">{{ Math.round(pass.endElevation) }}°</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">Start Azimuth:</span>
                      <span class="text-space-200">{{ Math.round(pass.startAzimuth) }}°</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">End Azimuth:</span>
                      <span class="text-space-200">{{ Math.round(pass.endAzimuth) }}°</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-space-400">Time Until Pass:</span>
                      <span class="text-primary-400 font-medium">{{ formatTimeUntilPass(pass.startTime, pass.endTime, pass.noradId) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Orbital Parameters Box -->
                <div v-if="getTLEData(pass.noradId)" class="mb-3">
                  <div class="text-sm text-space-300 mb-2">🛰️ Orbital Parameters (TLE)</div>
                  <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="text-xs text-space-400 space-y-1 font-mono">
                      <div v-if="getTLEData(pass.noradId).line1" class="break-all">{{ getTLEData(pass.noradId).line1 }}</div>
                      <div v-if="getTLEData(pass.noradId).line2" class="break-all">{{ getTLEData(pass.noradId).line2 }}</div>
                    </div>
                  </div>
                </div>

                <!-- Satellite Status -->
                <div v-if="getSatelliteData(pass.noradId)?.satellite?.status" class="mb-3">
                  <div class="text-sm text-space-300 mb-2">📊 Satellite Status</div>
                  <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="flex items-center gap-2">
                      <span :class="getStatusColor(getSatelliteData(pass.noradId).satellite.status)" class="font-medium">
                        {{ getStatusText(getSatelliteData(pass.noradId).satellite.status) }}
                      </span>
                      <span class="text-space-400">
                        {{ getSatelliteData(pass.noradId).satellite.names || 'No additional names' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Transmitter Count -->
                <div v-if="pass.transmitterCount > 0" class="mb-3">
                  <div class="text-sm text-space-300 mb-2">📡 Available Transmitters</div>
                  <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="text-space-200">
                      {{ pass.transmitterCount }} transmitter{{ pass.transmitterCount !== 1 ? 's' : '' }} available
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Individual Satellite Data (Hidden for now) -->
    <div v-if="false" class="max-w-lg mx-auto mb-6">
      <PassPredictData
        :combined-data="combinedData"
        :get-t-l-e-data="getTLEData"
        :format-frequency="formatFrequency"
      />
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import ObservationLocation from '~/components/common/ObservationLocation.vue'
import PassPredictData from '~/components/common/PassPredictData.vue'
import { useSettings } from '~/composables/storage/useSettings'
import { useTLEData } from '~/composables/api/useTLEData'
import { useIndexedDB } from '~/composables/storage/useIndexedDB'
import { usePassPrediction } from '~/composables/satellite/usePassPrediction'

// Import composables
const {
  settings,
  loadSettings
} = useSettings()

const {
  getTLEData,
  initializeTLEData
} = useTLEData()

const {
  getAllTransponderData,
  getAllPassPredictions
} = useIndexedDB()

const {
  calculatePassesForSatellites,
  getNextPassTime,
  formatPassTime,
  formatPassDuration,
  isLoading: isPassCalculating
} = usePassPrediction()

// Reactive state
const combinedData = ref({})
const passPredictions = ref(new Map())
const observerLocation = ref({ lat: 0, lng: 0, alt: 0 })
const currentTime = ref(Date.now()) // For real-time updates
const expandedSatellites = ref(new Set()) // Track which satellites are expanded

// Computed property for all passes sorted by time
const sortedPasses = computed(() => {
  console.log('🔄 Computing sorted passes...')
  console.log('🔄 passPredictions.value:', passPredictions.value)
  console.log('🔄 passPredictions.value.size:', passPredictions.value.size)

  const allPasses = []
  const currentTimeNow = currentTime.value

  // Get all passes from satellites that have at least one upcoming pass
  passPredictions.value.forEach((passes, noradId) => {
    console.log(`🔄 Processing passes for NORAD ID: ${noradId}, count: ${passes.length}`)

    // Special handling for geostationary satellites
    const geostationarySatellites = [43700] // QO-100 and other GEO satellites
    const isGeostationary = geostationarySatellites.includes(noradId)
    
    // Filter passes for this satellite - include passes that ended less than 10 seconds ago
    let validPasses = passes
    if (!isGeostationary) {
      validPasses = passes.filter(pass => {
        const timeSinceEnd = currentTimeNow - pass.endTime
        return pass.endTime > currentTimeNow || timeSinceEnd < 10000 // Keep passes that are upcoming OR ended less than 10 seconds ago
      })
    }
    
    // Only process satellites that have valid passes (upcoming or recently passed)
    if (validPasses.length > 0) {
      console.log(`🔄 Satellite ${noradId} has ${validPasses.length} valid passes`)

      // Find satellite name
      const satellite = settings.value.trackedSatellites?.find(s => parseInt(s.noradId) === noradId)
      const satelliteName = satellite?.name || satellite?.names || `Satellite ${noradId}`
      console.log(`🔄 Satellite name for ${noradId}: ${satelliteName}`)

      // Get transmitter count for this satellite
      const transmitterCount = combinedData.value[noradId]?.transmitters?.length || 0
      console.log(`🔄 Transmitter count for ${noradId}: ${transmitterCount}`)

      // Add each valid pass with satellite info
      validPasses.forEach((pass, index) => {
        console.log(`🔄 Adding pass ${index} for ${noradId}:`, pass)
        allPasses.push({
          ...pass,
          noradId,
          satelliteName,
          transmitterCount
        })
      })
    } else {
      console.log(`🔄 Skipping satellite ${noradId} - no upcoming passes`)
    }
  })

  console.log(`🔄 Total upcoming passes collected: ${allPasses.length}`)

  // Sort by start time (earliest first)
  const sorted = allPasses.sort((a, b) => a.startTime - b.startTime)
  console.log(`🔄 Sorted upcoming passes: ${sorted.length}`)

  return sorted
})

// Reactive state for pass status tracking
const passStatuses = ref(new Map()) // Track status of each pass: 'upcoming', 'passing', 'passed'
const passedPasses = ref(new Map()) // Track when passes ended for auto-removal

// Helper function to get pass status
const getPassStatus = (startTime, endTime, noradId) => {
  const geostationarySatellites = [43700] // QO-100 and other GEO satellites
  const isGeostationary = geostationarySatellites.includes(noradId)
  
  if (isGeostationary) {
    return 'stationary'
  }
  
  const now = currentTime.value
  
  if (now < startTime) {
    return 'upcoming'
  } else if (now >= startTime && now <= endTime) {
    return 'passing'
  } else {
    return 'passed'
  }
}

// Helper function to format time until pass with different states
const formatTimeUntilPass = (startTime, endTime, noradId) => {
  const status = getPassStatus(startTime, endTime, noradId)
  
  switch (status) {
    case 'stationary':
      return 'Stationary'
    case 'upcoming': {
      const timeUntil = startTime - currentTime.value
      const hours = Math.floor(timeUntil / (1000 * 60 * 60))
      const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeUntil % (1000 * 60)) / 1000)

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`
      } else {
        return `${seconds}s`
      }
    }
    case 'passing':
      return 'Passing'
    case 'passed':
      return 'Passed'
    default:
      return 'Unknown'
  }
}

// Debug function to check what's in the database
const debugDatabaseContents = async () => {
  try {
    console.log('🔍 Debug: Checking database contents...')

    // Check if we can access IndexedDB
    if (!window.indexedDB) {
      console.log('❌ IndexedDB not available')
      return
    }

    // Try to open the database and check contents
    const request = indexedDB.open('SatTrackDB', 3)

    request.onsuccess = (event) => {
      const db = event.target.result
      console.log('✅ Database opened successfully')

      // Check passPredictions store
      if (db.objectStoreNames.contains('passPredictions')) {
        const transaction = db.transaction(['passPredictions'], 'readonly')
        const store = transaction.objectStore('passPredictions')
        const countRequest = store.count()

        countRequest.onsuccess = () => {
          console.log(`📊 Pass predictions in database: ${countRequest.result} records`)

          // Get all records
          const getAllRequest = store.getAll()
          getAllRequest.onsuccess = () => {
            console.log('📊 All pass prediction records:', getAllRequest.result)
          }
        }
      } else {
        console.log('❌ passPredictions store does not exist')
      }

      db.close()
    }

    request.onerror = (event) => {
      console.log('❌ Failed to open database:', event.target.error)
    }

  } catch (error) {
    console.error('❌ Database debug error:', error)
  }
}

// Load stored pass predictions from database
const loadPassPredictions = async () => {
  try {
    console.log('🛰️ Loading stored pass predictions...')
    console.log('🛰️ Tracked satellites:', settings.value.trackedSatellites)

    if (!settings.value.trackedSatellites || settings.value.trackedSatellites.length === 0) {
      console.log('❌ No tracked satellites found')
      return
    }

    // Get observer location from settings
    observerLocation.value = {
      lat: settings.value.observerLatitude || 0,
      lng: settings.value.observerLongitude || 0,
      alt: settings.value.observerAltitude || 0
    }
    console.log('🛰️ Observer location:', observerLocation.value)

    // Load all stored pass predictions
    console.log('📊 Calling getAllPassPredictions()...')
    const allStoredPasses = await getAllPassPredictions()
    console.log('📊 getAllPassPredictions() result:', allStoredPasses)
    console.log('📊 Result type:', typeof allStoredPasses)
    console.log('📊 Is array:', Array.isArray(allStoredPasses))
    console.log('📊 Length:', allStoredPasses?.length)

    // Convert stored passes to the format expected by the UI
    const predictionsMap = new Map()

    if (Array.isArray(allStoredPasses)) {
      console.log('📊 Processing array of stored passes...')
      allStoredPasses.forEach((storedPass, index) => {
        console.log(`📊 Processing stored pass ${index}:`, storedPass)
        if (storedPass.noradId && storedPass.passes && Array.isArray(storedPass.passes)) {
          // Filter out expired passes when loading from database
          const currentTime = Date.now()
          const geostationarySatellites = [43700] // QO-100 and other GEO satellites
          const isGeostationary = geostationarySatellites.includes(storedPass.noradId)
          
          let validPasses = storedPass.passes
          if (!isGeostationary) {
            validPasses = storedPass.passes.filter(pass => pass.endTime > currentTime)
            if (storedPass.passes.length > validPasses.length) {
              console.log(`⏰ Filtered out ${storedPass.passes.length - validPasses.length} expired passes for NORAD ID: ${storedPass.noradId}`)
            }
          }
          
          if (validPasses.length > 0) {
            console.log(`📊 Adding ${validPasses.length} valid passes for NORAD ID: ${storedPass.noradId}`)
            predictionsMap.set(storedPass.noradId, validPasses)
          } else {
            console.log(`📊 No valid passes for NORAD ID: ${storedPass.noradId}`)
          }
        } else {
          console.log(`⚠️ Skipping invalid stored pass ${index}:`, storedPass)
        }
      })
    } else {
      console.log('⚠️ getAllPassPredictions() did not return an array')
    }

    passPredictions.value = predictionsMap
    console.log(`✅ Loaded pass predictions for ${predictionsMap.size} satellites`)
    console.log('📊 Final predictions map:', predictionsMap)

  } catch (error) {
    console.error('❌ Failed to load pass predictions:', error)
  }
}

// CTCSS parsing function
const parseCTCSS = (description) => {
  if (!description) return null

  // Look for CTCSS/subtone patterns like "67.0 Hz", "67.0", "CTCSS 67.0", etc.
  const ctcssPatterns = [
    /(\d+\.?\d*)\s*Hz/i,
    /CTCSS\s*(\d+\.?\d*)/i,
    /subtone\s*(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*CTCSS/i
  ]

  for (const pattern of ctcssPatterns) {
    const match = description.match(pattern)
    if (match) {
      return parseFloat(match[1])
    }
  }

  return null
}

// Load stored transmitter data
const loadStoredTransmitterData = async () => {
  try {
    const transmitterData = await getAllTransponderData()
    console.log('🔍 Debug: Raw transmitter data from IndexedDB:', transmitterData)
    console.log('🔍 Debug: Type of transmitter data:', typeof transmitterData)
    console.log('🔍 Debug: Is array?', Array.isArray(transmitterData))

    // Convert array to object keyed by NORAD ID
    const transmitterDataObj = {}
    if (Array.isArray(transmitterData)) {
      transmitterData.forEach(data => {
        console.log('🔍 Debug: Processing array item:', data)
        if (data.noradId) {
          // Handle different data structures
          if (Array.isArray(data.data)) {
            // Newer format: {noradId: 25544, data: Array(38), timestamp: '...'}
            transmitterDataObj[data.noradId] = data.data
          } else if (data.data && data.data.transmitters) {
            // Older format: {noradId: '25544', data: {transmitters: [...]}, timestamp: '...'}
            transmitterDataObj[data.noradId] = data.data.transmitters
          } else if (data.transmitters) {
            // Fallback: direct transmitters property
            transmitterDataObj[data.noradId] = data.transmitters
          } else {
            // Last resort: use the data as-is
            transmitterDataObj[data.noradId] = data.data || data
          }
        }
      })
    } else if (transmitterData && typeof transmitterData === 'object') {
      console.log('🔍 Debug: Processing object keys:', Object.keys(transmitterData))
      Object.keys(transmitterData).forEach(noradId => {
        transmitterDataObj[noradId] = transmitterData[noradId]
      })
    }

    console.log('🔍 Debug: Transmitter data converted to object:', Object.keys(transmitterDataObj))
    console.log('🔍 Debug: Sample transmitter data for ISS (25544):', transmitterDataObj['25544'])
    console.log('🔍 Debug: First ISS transmitter:', transmitterDataObj['25544']?.[0])

    // Analyze transmitter types for filtering
    const allTransmitters = Object.values(transmitterDataObj).flat()
    const transmitterTypes = new Set()
    const transmitterModes = new Set()
    const transmitterServices = new Set()

    allTransmitters.forEach(transmitter => {
      if (transmitter.description) {
        const desc = transmitter.description.toLowerCase()
        if (desc.includes('amateur') || desc.includes('ham')) transmitterTypes.add('amateur')
        if (desc.includes('fm')) transmitterTypes.add('fm')
        if (desc.includes('cw')) transmitterTypes.add('cw')
        if (desc.includes('aprs')) transmitterTypes.add('aprs')
        if (desc.includes('sstv')) transmitterTypes.add('sstv')
        if (desc.includes('telemetry')) transmitterTypes.add('telemetry')
        if (desc.includes('voice')) transmitterTypes.add('voice')
        if (desc.includes('repeater')) transmitterTypes.add('repeater')
        if (desc.includes('beacon')) transmitterTypes.add('beacon')
        if (desc.includes('weather') || desc.includes('apt')) transmitterTypes.add('weather')
        if (desc.includes('communication') || desc.includes('comm')) transmitterTypes.add('communication')
      }

      if (transmitter.mode) transmitterModes.add(transmitter.mode.toLowerCase())
      if (transmitter.service) transmitterServices.add(transmitter.service.toLowerCase())
    })

    console.log('🔍 Debug: Available transmitter types:', Array.from(transmitterTypes))
    console.log('🔍 Debug: Available transmitter modes:', Array.from(transmitterModes))
    console.log('🔍 Debug: Available transmitter services:', Array.from(transmitterServices))

    // Build combined data from tracked satellites with pass predictions
    const combined = {}
    if (settings.value.trackedSatellites) {
      // Create array of satellites with pass data for sorting
      const satellitesWithPasses = settings.value.trackedSatellites.map(satellite => {
        const noradId = parseInt(satellite.noradId)
        const passes = passPredictions.value.get(noradId) || []
        const nextPassTime = getNextPassTime(passes)

        return {
          ...satellite,
          noradId,
          nextPassTime: nextPassTime || Number.MAX_SAFE_INTEGER // Put satellites without passes at the end
        }
      })

      // Sort satellites by next pass time
      satellitesWithPasses.sort((a, b) => a.nextPassTime - b.nextPassTime)

      // Build combined data in sorted order
      satellitesWithPasses.forEach(satellite => {
        if (satellite.noradId) {
          const transmitters = transmitterDataObj[satellite.noradId] || []
          const passes = passPredictions.value.get(satellite.noradId) || []
          const nextPassTime = getNextPassTime(passes)

          combined[satellite.noradId] = {
            satellite: {
              name: satellite.name,
              status: satellite.status || 'alive',
              names: satellite.names || satellite.name
            },
            timestamp: new Date().toISOString(),
            transmitters: filterTransmitters(transmitters),
            passPredictions: {
              passes: passes,
              nextPassTime: nextPassTime,
              nextPassFormatted: nextPassTime ? formatPassTime(nextPassTime) : 'No upcoming passes',
              passCount: passes.length
            }
          }
        }
      })
    }

    combinedData.value = combined
    console.log('🔍 Debug: Final combined data:', Object.keys(combinedData.value))
    console.log('🔍 Debug: ISS combined data:', combinedData.value['25544'])
  } catch (error) {
    console.error('Failed to load stored transmitter data:', error)
  }
}

// Filter transmitters based on settings
const filterTransmitters = (transmitters) => {
  if (!transmitters || !Array.isArray(transmitters)) return []

  console.log('🔍 Debug: Filtering transmitters with settings:', settings.value.transmitterFilters)

  return transmitters.filter(transmitter => {
    if (!transmitter.description) return true

    const desc = transmitter.description.toLowerCase()
    const filters = settings.value.transmitterFilters || {}

    console.log(`🔍 Debug: Checking transmitter "${transmitter.description}" against filters:`, filters)

    // Check each filter type
    if (desc.includes('amateur') || desc.includes('ham')) {
      console.log('🔍 Debug: Found amateur/ham transmitter, filter enabled:', filters.amateur !== false)
      return filters.amateur !== false
    }
    if (desc.includes('fm')) {
      console.log('🔍 Debug: Found FM transmitter, filter enabled:', filters.fm !== false)
      return filters.fm !== false
    }
    if (desc.includes('cw')) {
      console.log('🔍 Debug: Found CW transmitter, filter enabled:', filters.cw !== false)
      return filters.cw !== false
    }
    if (desc.includes('aprs')) {
      console.log('🔍 Debug: Found APRS transmitter, filter enabled:', filters.aprs !== false)
      return filters.aprs !== false
    }
    if (desc.includes('sstv')) {
      console.log('🔍 Debug: Found SSTV transmitter, filter enabled:', filters.sstv !== false)
      return filters.sstv !== false
    }
    if (desc.includes('telemetry')) {
      console.log('🔍 Debug: Found telemetry transmitter, filter enabled:', filters.telemetry !== false)
      return filters.telemetry !== false
    }
    if (desc.includes('voice')) {
      console.log('🔍 Debug: Found voice transmitter, filter enabled:', filters.voice !== false)
      return filters.voice !== false
    }
    if (desc.includes('repeater')) {
      console.log('🔍 Debug: Found repeater transmitter, filter enabled:', filters.repeater !== false)
      return filters.repeater !== false
    }
    if (desc.includes('beacon')) {
      console.log('🔍 Debug: Found beacon transmitter, filter enabled:', filters.beacon !== false)
      return filters.beacon !== false
    }
    if (desc.includes('weather') || desc.includes('apt')) {
      console.log('🔍 Debug: Found weather transmitter, filter enabled:', filters.weather !== false)
      return filters.weather !== false
    }
    if (desc.includes('communication') || desc.includes('comm')) {
      console.log('🔍 Debug: Found communication transmitter, filter enabled:', filters.communication !== false)
      return filters.communication !== false
    }

    // If no specific type matches, show it (default behavior)
    console.log('🔍 Debug: No specific type match, showing transmitter by default')
    return true
  })
}

const formatFrequency = (transmitter) => {
  if (!transmitter) return 'Unknown'

  // Try different frequency field names from SatNOGS API
  let frequency = transmitter.downlink_low ||
                 transmitter.uplink_low ||
                 transmitter.downlink_high ||
                 transmitter.uplink_high ||
                 transmitter.frequency ||
                 transmitter.downlink_frequency ||
                 transmitter.uplink_frequency

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

// Watch for changes in transmitter filters and reload data
watch(() => settings.value.transmitterFilters, async () => {
  console.log('🔍 Debug: Transmitter filters changed, reloading data...')
  await loadStoredTransmitterData()
}, { deep: true })

// Collapsible functionality for individual passes
const isPassExpanded = (noradId, startTime) => {
  const passKey = `${noradId}-${startTime}`
  return expandedSatellites.value.has(passKey)
}

const togglePassData = (noradId, startTime) => {
  const passKey = `${noradId}-${startTime}`
  if (expandedSatellites.value.has(passKey)) {
    expandedSatellites.value.delete(passKey)
  } else {
    expandedSatellites.value.add(passKey)
  }
}

// Helper function to get satellite data by NORAD ID
const getSatelliteData = (noradId) => {
  return combinedData.value[noradId] || null
}

// Helper functions for satellite name formatting
const getFormattedSatelliteName = (satellite, noradId) => {
  if (!satellite) {
    return { primary: `Satellite ${noradId}`, secondary: null }
  }

  const primary = satellite.name || satellite.names || `Satellite ${noradId}`
  const secondary = satellite.names && satellite.name && satellite.names !== satellite.name ? satellite.names : null

  return { primary, secondary }
}

// Helper functions for status display
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'alive':
    case 'active':
      return 'text-green-400'
    case 'dead':
    case 'inactive':
      return 'text-red-400'
    case 'decayed':
      return 'text-orange-400'
    default:
      return 'text-space-300'
  }
}

const getStatusText = (status) => {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

// Real-time update for time until pass
const timeUpdateInterval = ref(null)

// Function to clean up expired passes from the current data
const cleanupExpiredPasses = () => {
  console.log('🧹 Cleaning up expired passes from current data...')
  const currentTime = Date.now()
  const geostationarySatellites = [43700] // QO-100 and other GEO satellites
  
  const updatedPredictions = new Map()
  let totalRemoved = 0
  let satellitesRemoved = 0
  
  passPredictions.value.forEach((passes, noradId) => {
    const isGeostationary = geostationarySatellites.includes(noradId)
    
    if (isGeostationary) {
      // Keep all passes for geostationary satellites
      updatedPredictions.set(noradId, passes)
    } else {
      // Filter out expired passes
      const validPasses = passes.filter(pass => pass.endTime > currentTime)
      const removedCount = passes.length - validPasses.length
      
      if (removedCount > 0) {
        console.log(`🧹 Removed ${removedCount} expired passes for NORAD ID: ${noradId}`)
        totalRemoved += removedCount
      }
      
      if (validPasses.length > 0) {
        updatedPredictions.set(noradId, validPasses)
      } else {
        console.log(`🧹 Completely removed satellite ${noradId} - no upcoming passes`)
        satellitesRemoved++
      }
    }
  })
  
  if (totalRemoved > 0 || satellitesRemoved > 0) {
    console.log(`🧹 Total expired passes removed: ${totalRemoved}, satellites removed: ${satellitesRemoved}`)
    passPredictions.value = updatedPredictions
  }
}

// Function to handle auto-removal of passed satellites after 10 seconds
const handleAutoRemoval = () => {
  const currentTime = Date.now()
  const geostationarySatellites = [43700] // QO-100 and other GEO satellites
  
  // Check for passes that ended more than 10 seconds ago
  const updatedPredictions = new Map()
  let removedCount = 0
  
  passPredictions.value.forEach((passes, noradId) => {
    const isGeostationary = geostationarySatellites.includes(noradId)
    
    if (isGeostationary) {
      // Keep all passes for geostationary satellites
      updatedPredictions.set(noradId, passes)
    } else {
      // Filter out passes that ended more than 10 seconds ago
      const validPasses = passes.filter(pass => {
        const timeSinceEnd = currentTime - pass.endTime
        return timeSinceEnd < 10000 // Keep passes that ended less than 10 seconds ago
      })
      
      const removedPasses = passes.length - validPasses.length
      if (removedPasses > 0) {
        console.log(`⏰ Auto-removed ${removedPasses} passes for NORAD ID: ${noradId} (ended ${Math.round((currentTime - passes[0]?.endTime) / 1000)}s ago)`)
        removedCount += removedPasses
      }
      
      if (validPasses.length > 0) {
        updatedPredictions.set(noradId, validPasses)
      }
    }
  })
  
  if (removedCount > 0) {
    console.log(`⏰ Auto-removed ${removedCount} total passes`)
    passPredictions.value = updatedPredictions
  }
}

onMounted(async () => {
  console.log('🚀 Pass-predict page mounted, starting data loading...')

  await loadSettings()
  console.log('🔍 Debug: Settings loaded:', settings.value.transmitterFilters)
  console.log('🔍 Debug: Tracked satellites:', settings.value.trackedSatellites)
  console.log('🔍 Debug: Observer location:', settings.value.observationLocation)

  await initializeTLEData(settings.value.trackedSatellites, settings.value.spaceTrackUsername, settings.value.spaceTrackPassword, settings.value.satnogsToken)

  // Load stored pass predictions instead of calculating them
  console.log('🔄 About to load pass predictions...')
  await loadPassPredictions()
  console.log('🔄 Pass predictions loaded, checking results...')
  console.log('🔄 passPredictions.value:', passPredictions.value)
  console.log('🔄 passPredictions.value.size:', passPredictions.value.size)

  // Debug database contents
  await debugDatabaseContents()

  // Load stored transmitter data (now with pass predictions)
  await loadStoredTransmitterData()

  // Start real-time updates for time until pass
  timeUpdateInterval.value = setInterval(() => {
    currentTime.value = Date.now()
    
    // Handle auto-removal of passed satellites (every second)
    handleAutoRemoval()
    
    // Also cleanup expired passes every 30 seconds
    if (Date.now() % 30000 < 1000) {
      cleanupExpiredPasses()
    }
  }, 1000)

  // Initial cleanup of expired passes
  cleanupExpiredPasses()

  console.log('✅ Pass-predict page initialization complete')
})

// Cleanup interval on unmount
onUnmounted(() => {
  if (timeUpdateInterval.value) {
    clearInterval(timeUpdateInterval.value)
  }
})
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

/* Passing state styling - only header blinking, no card background changes */
.passing-card .text-primary-300 {
  color: #10b981 !important; /* green-500 */
}
</style>
