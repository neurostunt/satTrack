<template>
  <div v-if="passSchedule && passSchedule.length > 0" class="max-w-lg mx-auto mb-6">
    <div class="bg-space-800 border border-space-700 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
        📅 Upcoming Satellite Passes
        <span class="ml-2 text-sm text-space-300">({{ passSchedule.length }} passes)</span>
      </h3>

      <!-- Observation Location -->
      <div v-if="userLocation" class="mb-4 p-2 bg-space-900 border border-space-700 rounded-lg">
        <h4 class="text-sm font-semibold text-space-300 mb-1">Observation Location:</h4>
        <div class="text-space-400 text-sm">
          {{ userLocation.latitude?.toFixed(6) }}°N, {{ userLocation.longitude?.toFixed(6) }}°E <span class="text-space-500">Grid Square: {{ userLocation.gridSquare }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <div class="text-space-300">Loading satellite data...</div>
      </div>

      <!-- Calculating State -->
      <div v-else-if="isCalculating" class="text-center py-8">
        <div class="animate-pulse w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <div class="text-space-300 mb-2">Calculating satellite passes...</div>
        <div class="text-sm text-space-400 mb-2">
          {{ calculationProgress.currentSatellite }}
        </div>
        <div class="w-full bg-space-800 rounded-full h-2 mb-2">
          <div
            class="bg-yellow-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${(calculationProgress.current / calculationProgress.total) * 100}%` }"
          ></div>
        </div>
        <div class="text-xs text-space-500">
          {{ calculationProgress.current }} / {{ calculationProgress.total }} satellites
        </div>
      </div>

      <!-- Pass Schedule -->
      <div v-else>
        <!-- Show current results even while calculating -->
        <div v-if="passSchedule.length > 0 && isCalculating" class="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div class="text-yellow-400 text-sm">
            📡 Found {{ passSchedule.length }} passes so far, calculating more...
          </div>
        </div>

        <div class="space-y-4">
                 <div
                   v-for="pass in passSchedule"
                   :key="`${pass.noradId}-${pass.startTime}`"
                   :class="[getPassBackgroundClass(pass), getPassBorderClass(pass)]"
                   class="rounded p-3 cursor-pointer"
                   @click="togglePass(`${pass.noradId}-${pass.startTime}`)"
                 >
          <!-- Clickable Header -->
          <div class="mb-1">
                     <!-- First line: Satellite info -->
                     <div class="flex items-center justify-between mb-1" :class="getPassTitleClass(pass)">
                       <div>
                         <div class="text-sm font-semibold text-primary-300">{{ pass.name }} <span class="text-xs text-space-400">NORAD: {{ pass.noradId }}</span></div>
                         <div v-if="pass.status && pass.status !== 'alive'" :class="getStatusColor(pass.status)" class="text-xs font-medium">{{ getStatusText(pass.status) }}</div>
                       </div>
                       <div class="transform transition-transform duration-500 ease-in-out" :class="{ 'rotate-180': expandedPasses.has(`${pass.noradId}-${pass.startTime}`) }">
                         <svg class="w-4 h-4 text-space-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                         </svg>
                       </div>
                     </div>

            <!-- Second line: Pass info -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-space-400">
                {{ formatDuration(pass.duration) }} • {{ formatDateTime(pass.maxElevationTime) }} • {{ pass.maxElevation }}°
              </span>
              <span class="text-xs text-space-400">{{ getCountdown(pass.startTime, pass.endTime) }}</span>
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
                v-show="expandedPasses.has(`${pass.noradId}-${pass.startTime}`)"
                class="overflow-hidden"
              >
                <!-- Satellite Pass Visualization for this specific pass -->
                <div class="mb-4">
                  <SatellitePassVisualization
                    :passes="[pass]"
                    :user-location="userLocation"
                  />
                </div>

                <!-- Pass Timing -->
                <div class="mb-3">
                  <div class="text-sm text-space-300 mb-2">🕐 Pass Timing</div>
                  <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="grid grid-cols-2 gap-2 text-space-300">
                      <div>
                        <span class="text-space-400">Start:</span>
                        <span class="text-space-200 ml-1">{{ formatDateTime(pass.startTime) }}</span>
                      </div>
                      <div>
                        <span class="text-space-400">End:</span>
                        <span class="text-space-200 ml-1">{{ formatDateTime(pass.endTime) }}</span>
                      </div>
                      <div>
                        <span class="text-space-400">Duration:</span>
                        <span class="text-space-200 ml-1">{{ formatDuration(pass.duration) }}</span>
                      </div>
                      <div>
                        <span class="text-space-400">Peak:</span>
                        <span class="text-space-200 ml-1">{{ formatDateTime(pass.maxElevationTime) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Elevation Info -->
                <div class="mb-3">
                  <div class="text-sm text-space-300 mb-2">📐 Elevation</div>
                  <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="text-space-300">
                      <span class="text-space-400">Maximum Elevation:</span>
                      <span class="text-space-200 ml-1 font-semibold">{{ pass.maxElevation }}°</span>
                    </div>
                  </div>
                </div>

                <!-- Countdown Timer -->
                <div class="mb-3">
                  <div class="text-sm text-space-300 mb-2">⏰ Countdown</div>
                  <div class="bg-space-800 border border-space-500 rounded p-2 text-xs">
                    <div class="text-space-300">
                      <span class="text-space-400">Time until pass:</span>
                      <span class="text-space-200 ml-1 font-semibold">{{ getCountdown(pass.startTime, pass.endTime) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- No Data State -->
  <div v-else class="max-w-lg mx-auto mb-6">
    <div class="bg-space-800 border border-space-700 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-primary-400 mb-4 flex items-center">
        📅 Upcoming Satellite Passes
        <span class="ml-2 text-sm text-space-300">(0 passes)</span>
      </h3>

      <!-- Observation Location -->
      <div v-if="userLocation" class="mb-4 p-2 bg-space-900 border border-space-700 rounded-lg">
        <h4 class="text-sm font-semibold text-space-300 mb-1">Observation Location:</h4>
        <div class="text-space-400 text-sm">
          {{ userLocation.latitude?.toFixed(6) }}°N, {{ userLocation.longitude?.toFixed(6) }}°E <span class="text-space-500">Grid Square: {{ userLocation.gridSquare }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <div class="text-space-300">Loading satellite data...</div>
      </div>

      <!-- Calculating State -->
      <div v-else-if="isCalculating" class="text-center py-8">
        <div class="animate-pulse w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <div class="text-space-300 mb-2">Calculating satellite passes...</div>
        <div class="text-sm text-space-400 mb-2">
          {{ calculationProgress.currentSatellite }}
        </div>
        <div class="w-full bg-space-800 rounded-full h-2 mb-2">
          <div
            class="bg-yellow-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${(calculationProgress.current / calculationProgress.total) * 100}%` }"
          ></div>
        </div>
        <div class="text-xs text-space-500">
          {{ calculationProgress.current }} / {{ calculationProgress.total }} satellites
        </div>
      </div>

      <!-- No Data State -->
      <div v-else class="text-center py-8">
        <div class="text-space-400 mb-4">No satellite passes calculated</div>
        <div class="text-sm text-space-500 mb-4">
          Make sure you have tracked satellites and valid location data
        </div>
        <div v-if="Object.keys(getAllTLEData()).length === 0" class="text-red-400 text-sm mb-4">
          ⚠️ No TLE data found. Go to Settings → Satellite Management → Fetch TLE Data
        </div>
        <div class="mt-4">
          <NuxtLink
            to="/settings"
            class="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Go to Settings
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTLEData } from '~/composables/useTLEData.js'
import { useSettings } from '~/composables/useSettings.js'

// Composables
const { getAllTLEData, hasTLEData, initializeTLEData } = useTLEData()
const { settings, loadSettings } = useSettings()

// Reactive state
const passSchedule = ref([])
const expandedPasses = ref(new Set())
const isLoading = ref(false)
const updateInterval = ref(null)
const countdownInterval = ref(null)
const nextUpdateTime = ref('')
const calculationProgress = ref({ current: 0, total: 0, currentSatellite: '' })
const isCalculating = ref(false)

// User location
const userLocation = computed(() => {
  console.log('🔍 Computing user location...')
  console.log('Settings:', {
    useGridSquare: settings.value.useGridSquare,
    gridSquare: settings.value.gridSquare,
    latitude: settings.value.latitude,
    longitude: settings.value.longitude
  })

  if (settings.value.useGridSquare && settings.value.gridSquare) {
    try {
      const coords = getCoordinatesFromGridSquare(settings.value.gridSquare)
      console.log('📍 Grid square coordinates:', coords)
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        gridSquare: settings.value.gridSquare
      }
    } catch (error) {
      console.error('❌ Invalid grid square:', error)
      return null
    }
  } else if (settings.value.latitude && settings.value.longitude) {
    console.log('📍 Using lat/lng coordinates:', settings.value.latitude, settings.value.longitude)
    return {
      latitude: settings.value.latitude,
      longitude: settings.value.longitude,
      gridSquare: settings.value.gridSquare || latLngToGridSquare(settings.value.latitude, settings.value.longitude)
    }
  }

  console.log('❌ No valid location found')
  return null
})

// Helper functions
const getCoordinatesFromGridSquare = (gridSquare) => {
  console.log('🔧 Converting grid square:', gridSquare)

  if (!gridSquare || gridSquare.length < 4) {
    throw new Error('Invalid grid square format')
  }

  const grid = gridSquare.toUpperCase()
  console.log('🔧 Grid string:', grid)

  // Parse basic fields (4 characters minimum)
  const field1 = grid.charCodeAt(0) - 65
  const field2 = grid.charCodeAt(1) - 65
  const square1 = parseInt(grid.charAt(2))
  const square2 = parseInt(grid.charAt(3))

  console.log('🔧 Basic fields:', { field1, field2, square1, square2 })

  // Parse subsquares (6 characters)
  let subsquare1 = 0
  let subsquare2 = 0

  if (grid.length >= 6) {
    subsquare1 = grid.charCodeAt(4) - 65
    subsquare2 = grid.charCodeAt(5) - 65
  }

  // Parse extended subsquares (8 characters)
  let subsquare3 = 0
  let subsquare4 = 0

  if (grid.length >= 8) {
    // For 8-character grid squares, characters 6 and 7 are numbers (0-9)
    subsquare3 = parseInt(grid.charAt(6)) || 0
    subsquare4 = parseInt(grid.charAt(7)) || 0
  }

  console.log('🔧 Subsquares:', { subsquare1, subsquare2, subsquare3, subsquare4 })

  // Calculate coordinates
  let longitude = (field1 * 20 - 180) + (square1 * 2)
  let latitude = (field2 * 10 - 90) + (square2 * 1)

  // Add subsquare precision
  if (grid.length >= 6) {
    longitude += subsquare1 * 0.083333
    latitude += subsquare2 * 0.041667
  }

  // Add extended subsquare precision
  if (grid.length >= 8) {
    longitude += subsquare3 * 0.008333
    latitude += subsquare4 * 0.004167
  }

  console.log('🔧 Calculated coordinates:', { latitude, longitude })

  return { latitude, longitude }
}

const latLngToGridSquare = (lat, lng) => {
  const field1 = Math.floor((lng + 180) / 20)
  const field2 = Math.floor((lat + 90) / 10)
  const square1 = Math.floor(((lng + 180) % 20) / 2)
  const square2 = Math.floor(((lat + 90) % 10) / 1)
  const subsquare1 = Math.floor((((lng + 180) % 20) % 2) / 0.083333)
  const subsquare2 = Math.floor((((lat + 90) % 10) % 1) / 0.041667)
  const subsquare3 = Math.floor((((((lng + 180) % 20) % 2) % 0.083333) / 0.008333))
  const subsquare4 = Math.floor((((((lat + 90) % 10) % 1) % 0.041667) / 0.004167))

  return String.fromCharCode(65 + field1) +
         String.fromCharCode(65 + field2) +
         square1 +
         square2 +
         String.fromCharCode(65 + subsquare1) +
         String.fromCharCode(65 + subsquare2) +
         subsquare3 +
         subsquare4
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const formatDuration = (minutes) => {
  if (typeof minutes !== 'number' || isNaN(minutes)) return 'N/A'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h > 0 ? h + 'h ' : ''}${m}m`
}

const isPassActive = (pass) => {
  const now = new Date()
  const startTime = new Date(pass.startTime)
  const endTime = new Date(pass.endTime)
  return now >= startTime && now <= endTime
}

const getCountdown = (startTimeString, endTimeString) => {
  const now = new Date()
  const startTime = new Date(startTimeString)
  const endTime = new Date(endTimeString)
  const diff = startTime.getTime() - now.getTime()

  // Check if pass is currently active (between start and end)
  if (now >= startTime && now <= endTime) {
    return 'Passing'
  }

  // Check if pass has ended
  if (now > endTime) {
    return 'Passed'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  // Format as "14 Oct, 03:18" style
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'alive':
      return 'text-green-400'
    case 'dead':
      return 'text-red-400'
    case 'future':
      return 'text-yellow-400'
    case 're-entered':
      return 'text-gray-400'
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
    case 'future':
      return 'FUTURE'
    case 're-entered':
      return 'RE-ENTERED'
    default:
      return 'UNKNOWN'
  }
}

const getPassBorderClass = (pass) => {
  if (isPassActive(pass)) {
    return 'border-primary-400'
  }
  return 'border-space-600'
}

const getPassTitleClass = (pass) => {
  if (isPassActive(pass)) {
    return 'animate-pulse'
  }
  return ''
}

const getPassBackgroundClass = (pass) => {
  if (isPassActive(pass)) {
    return 'bg-space-900/80'
  }
  return 'bg-space-900'
}

const togglePass = (passKey) => {
  if (expandedPasses.value.has(passKey)) {
    expandedPasses.value.delete(passKey)
  } else {
    expandedPasses.value.add(passKey)
  }
}

/**
 * Calculate satellite passes using Web Worker
 */
const calculatePassSchedule = async () => {
  console.log('=== CALCULATE PASS SCHEDULE START ===')
  console.log('User location:', userLocation.value)
  console.log('Tracked satellites:', settings.value.trackedSatellites?.length)

  if (!userLocation.value || !settings.value.trackedSatellites?.length) {
    console.log('❌ No location or satellites available')
    passSchedule.value = []
    return
  }

  console.log('✅ Starting pass calculations with Web Worker...')
  isLoading.value = false
  isCalculating.value = true

           // Initialize progress - process only first 5 satellites
           const satellitesToProcess = settings.value.trackedSatellites.slice(0, 5)
           console.log('📊 Satellites to process:', satellitesToProcess.map(s => `${s.name} (${s.noradId})`))
           calculationProgress.value = {
             current: 0,
             total: satellitesToProcess.length,
             currentSatellite: ''
           }

  try {
    const passes = []
    const now = new Date()

    // Process satellites in parallel using Web Workers
    const workerPromises = satellitesToProcess.map(async (satellite, index) => {
      if (!hasTLEData(satellite.noradId)) {
        console.log(`⏭️ Skipping ${satellite.name} - no TLE data`)
        return []
      }

      // Update progress
      calculationProgress.value.current = index + 1
      calculationProgress.value.currentSatellite = `Processing ${satellite.name}...`

      console.log(`🛰️ Processing satellite ${satellite.name} (${satellite.noradId})`)

      return new Promise((resolve) => {
        const worker = new Worker('/utils/passCalculationWorker.js')

        // Set timeout for worker
        const timeout = setTimeout(() => {
          worker.terminate()
          console.log(`⏰ Timeout for ${satellite.name}`)
          resolve([])
        }, 15000) // 15 second timeout

        worker.onmessage = (e) => {
          clearTimeout(timeout)
          worker.terminate()

          if (e.data.success) {
            console.log(`✅ Found ${e.data.passes.length} passes for ${satellite.name}`)
            resolve(e.data.passes)
          } else {
            console.log(`❌ Error calculating passes for ${satellite.name}:`, e.data.error)
            resolve([])
          }
        }

        worker.onerror = (error) => {
          clearTimeout(timeout)
          worker.terminate()
          console.error(`💥 Worker error for ${satellite.name}:`, error)
          resolve([])
        }

        // Send data to worker (simplified for cloning)
        const tleData = getAllTLEData()[satellite.noradId]
        worker.postMessage({
          tleData: {
            tle1: tleData.tle1,
            tle2: tleData.tle2,
            noradId: tleData.noradId,
            name: tleData.name
          },
          observerLocation: {
            latitude: userLocation.value.latitude,
            longitude: userLocation.value.longitude,
            altitude: userLocation.value.altitude || 0
          },
          startTime: now.toISOString(),
          maxDays: 1,
          satelliteInfo: {
            noradId: satellite.noradId,
            name: satellite.name,
            status: satellite.status || 'alive'
          },
          minimumElevation: settings.value.minimumElevation || 0
        })
      })
    })

    // Wait for all workers to complete
    const results = await Promise.all(workerPromises)

    // Flatten results
    results.forEach(satellitePasses => {
      passes.push(...satellitePasses)
    })

    // Sort passes by start time
    passes.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

    console.log(`🎉 TOTAL PASSES CALCULATED: ${passes.length}`)
    console.log('Pass schedule:', passes)

    passSchedule.value = passes
  } catch (error) {
    console.error('💥 Error calculating pass schedule:', error)
  } finally {
    isCalculating.value = false
    console.log('=== CALCULATE PASS SCHEDULE END ===')
  }
}

const updateNextUpdateTime = () => {
  const now = new Date()
  const nextUpdate = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now
  nextUpdateTime.value = nextUpdate.toLocaleTimeString()
}

const startCountdownInterval = () => {
  // Clear existing interval
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  // Start new interval that updates every second
  countdownInterval.value = setInterval(() => {
    // Force reactivity update by triggering a re-render
    // This will cause getCountdown to be called again for each pass
    // and update blinking effects for active passes
    passSchedule.value = [...passSchedule.value]
  }, 1000)
}

// Lifecycle
onMounted(async () => {
  console.log('SatellitePassSchedule mounted')

  // Load settings first
  await loadSettings()
  console.log('Settings loaded:', settings.value)

  // Initialize TLE data if not already loaded
  console.log('Before initializeTLEData:')
  console.log('- trackedSatellites:', settings.value.trackedSatellites?.length)
  console.log('- username:', settings.value.spaceTrackUsername ? 'present' : 'missing')
  console.log('- password:', settings.value.spaceTrackPassword ? 'present' : 'missing')

  await initializeTLEData(
    settings.value.trackedSatellites,
    settings.value.spaceTrackUsername,
    settings.value.spaceTrackPassword,
    settings.value.satnogsToken
  )

  console.log('After initializeTLEData:')
  console.log('- TLE data keys:', Object.keys(getAllTLEData()))
  console.log('- TLE data count:', Object.keys(getAllTLEData()).length)
  console.log('TLE data initialized')

  // Start calculation asynchronously (non-blocking)
  calculatePassSchedule()
  updateNextUpdateTime()

  // Start countdown interval for live updates
  startCountdownInterval()

  // Update every 5 minutes
  updateInterval.value = setInterval(async () => {
    await calculatePassSchedule()
    updateNextUpdateTime()
  }, 5 * 60 * 1000)
})

// Watch for expired passes and recalculate
watch(passSchedule, (newSchedule) => {
  const now = new Date()
  const expiredPasses = newSchedule.filter(pass => {
    const endTime = new Date(pass.endTime)
    return endTime < now
  })

  if (expiredPasses.length > 0) {
    console.log(`🗑️ Removing ${expiredPasses.length} expired passes`)
    // Remove expired passes
    passSchedule.value = newSchedule.filter(pass => {
      const endTime = new Date(pass.endTime)
      return endTime >= now
    })

    // If we removed passes, recalculate to get more
    if (passSchedule.value.length < 5) {
      console.log('🔄 Recalculating to get more passes...')
      setTimeout(() => {
        calculatePassSchedule()
      }, 1000) // Wait 1 second before recalculating
    }
  }
}, { deep: true })

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
})
</script>
