/**
 * Performance-Optimized Satellite Tracking
 * Implements smart updates, caching, and Web Workers
 */

import { useTLEData } from '~/composables/useTLEData.js'
import { useOptimizedSatelliteCalculations } from '~/composables/useOptimizedSatelliteCalculations.js'
import satelliteWorkerManager from '~/utils/satelliteWorkerManager.js'
import secureStorage from '~/utils/secureStorage.js'

export const useOptimizedSatelliteTracking = () => {
  // Composables
  const {
    tleData,
    isLoading: tleLoading,
    fetchTLEData,
    getTLEData,
    hasTLEData,
    getDataFreshness,
    initializeTLEData,
    refreshTLEData,
    isOffline,
    cacheStatus
  } = useTLEData()

  const {
    calculateSatellitePosition: fallbackCalculate,
    getSmartUpdateInterval,
    getPerformanceMetrics,
    clearCaches
  } = useOptimizedSatelliteCalculations()

  // Reactive data
  const selectedSatellite = ref('')
  const satelliteAzimuth = ref(0)
  const satelliteElevation = ref(0)
  const azimuthDelta = ref(0)
  const elevationDelta = ref(0)
  const satelliteRange = ref(0)
  const nextPassTime = ref('Calculating...')

  // Performance tracking
  const performanceStats = ref({
    calculationTime: 0,
    cacheHitRate: 0,
    updateInterval: 5000,
    workerEnabled: false,
    totalCalculations: 0
  })

  // Settings
  const settings = ref({
    trackedSatellites: [],
    updateInterval: 5000,
    distanceUnits: 'km'
  })

  // Credentials
  const credentials = ref({
    username: '',
    password: ''
  })

  // User location
  const userLocation = ref({
    latitude: 0,
    longitude: 0,
    altitude: 0,
    accuracy: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0
  })

  // Device orientation
  const deviceOrientation = ref({
    alpha: 0,
    beta: 0,
    gamma: 0
  })

  // Previous position for smart updates
  const previousPosition = ref(null)
  const updateTimer = ref(null)

  /**
   * Initialize Web Worker
   */
  const initWorker = async () => {
    try {
      const workerReady = await satelliteWorkerManager.init()
      performanceStats.value.workerEnabled = workerReady
      console.log('Web Worker initialized:', workerReady)
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error)
      performanceStats.value.workerEnabled = false
    }
  }

  /**
   * Optimized satellite position calculation
   */
  const calculateCurrentSatellitePosition = async () => {
    const startTime = performance.now()

    if (!userLocation.value.latitude || !userLocation.value.longitude) {
      console.warn('No user location available for satellite calculation')
      return
    }

    // Find selected satellite
    const selectedSat = settings.value.trackedSatellites.find(sat => sat.name === selectedSatellite.value)
    if (!selectedSat) {
      console.warn('Selected satellite not found')
      return
    }

    // Check if we have TLE data
    if (!hasTLEData(selectedSat.noradId)) {
      console.warn(`No TLE data available for ${selectedSat.name} (${selectedSat.noradId})`)

      if (credentials.value.username && credentials.value.password) {
        try {
          await fetchTLEData([selectedSat], credentials.value.username, credentials.value.password)
        } catch (error) {
          console.error('Failed to fetch TLE data:', error)
        }
      }
      return
    }

    try {
      const tleData = getTLEData(selectedSat.noradId)
      const observerLocation = {
        latitude: userLocation.value.latitude,
        longitude: userLocation.value.longitude,
        altitude: userLocation.value.altitude
      }

      let position

      // Try Web Worker first, fallback to main thread
      if (performanceStats.value.workerEnabled && satelliteWorkerManager.isReady()) {
        try {
          position = await satelliteWorkerManager.calculateSatellitePosition(tleData, observerLocation)
        } catch (error) {
          console.warn('Web Worker calculation failed, using fallback:', error)
          position = fallbackCalculate(tleData, observerLocation)
        }
      } else {
        position = fallbackCalculate(tleData, observerLocation)
      }

      if (position && !position.error) {
        // Batch DOM updates
        const updates = {
          satelliteAzimuth: position.azimuth,
          satelliteElevation: position.elevation,
          satelliteRange: settings.value.distanceUnits === 'miles' ? position.rangeMiles : position.rangeKm
        }

        // Apply updates in batch
        Object.assign({
          satelliteAzimuth: satelliteAzimuth.value,
          satelliteElevation: satelliteElevation.value,
          satelliteRange: satelliteRange.value
        }, updates)

        // Calculate deltas
        const currentHeading = userLocation.value.heading || 0
        azimuthDelta.value = Math.round(position.azimuth - currentHeading)
        elevationDelta.value = Math.round(position.elevation - deviceOrientation.value.beta)

        // Update performance stats
        performanceStats.value.calculationTime = performance.now() - startTime
        performanceStats.value.totalCalculations++

        // Smart update interval
        if (previousPosition.value) {
          const smartInterval = getSmartUpdateInterval(position, previousPosition.value)
          performanceStats.value.updateInterval = smartInterval

          // Adjust timer if needed
          if (updateTimer.value) {
            clearInterval(updateTimer.value)
            updateTimer.value = setInterval(calculateCurrentSatellitePosition, smartInterval)
          }
        }

        previousPosition.value = position

        console.log('Satellite position calculated:', {
          ...position,
          calculationTime: performanceStats.value.calculationTime,
          cached: position.cached || false
        })
      } else {
        console.warn('Failed to calculate satellite position:', position?.error)
      }
    } catch (error) {
      console.error('Satellite calculation error:', error)
    }
  }

  /**
   * Start optimized tracking
   */
  const startTracking = () => {
    if (updateTimer.value) {
      clearInterval(updateTimer.value)
    }

    // Start with smart interval
    const interval = performanceStats.value.updateInterval
    updateTimer.value = setInterval(calculateCurrentSatellitePosition, interval)

    // Initial calculation
    calculateCurrentSatellitePosition()
  }

  /**
   * Stop tracking
   */
  const stopTracking = () => {
    if (updateTimer.value) {
      clearInterval(updateTimer.value)
      updateTimer.value = null
    }
  }

  /**
   * Load settings from secure storage
   */
  const loadSettings = async () => {
    try {
      const savedSettings = await secureStorage.getSettings()
      if (savedSettings) {
        settings.value = { ...settings.value, ...savedSettings }
      }

      const storedCredentials = await secureStorage.getCredentials()
      if (storedCredentials) {
        credentials.value = storedCredentials
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  /**
   * Initialize tracking system
   */
  const initialize = async () => {
    await loadSettings()
    await initWorker()

    // Initialize TLE data
    if (credentials.value.username && credentials.value.password) {
      try {
        await initializeTLEData(settings.value.trackedSatellites, credentials.value.username, credentials.value.password)
      } catch (error) {
        console.error('TLE data initialization failed:', error.message)
      }
    }

    // Start tracking
    startTracking()
  }

  /**
   * Get comprehensive performance metrics
   */
  const getComprehensiveMetrics = async () => {
    const mainThreadMetrics = getPerformanceMetrics()
    let workerMetrics = null

    if (performanceStats.value.workerEnabled) {
      try {
        workerMetrics = await satelliteWorkerManager.getPerformanceMetrics()
      } catch (error) {
        console.error('Failed to get worker metrics:', error)
      }
    }

    return {
      mainThread: mainThreadMetrics,
      worker: workerMetrics,
      performance: performanceStats.value,
      tleData: getDataFreshness(),
      cacheStatus: cacheStatus.value
    }
  }

  /**
   * Clear all caches
   */
  const clearAllCaches = async () => {
    clearCaches()
    if (performanceStats.value.workerEnabled) {
      await satelliteWorkerManager.clearCaches()
    }
    console.log('All caches cleared')
  }

  /**
   * Cleanup
   */
  const cleanup = () => {
    stopTracking()
    satelliteWorkerManager.terminate()
  }

  return {
    // State
    selectedSatellite,
    satelliteAzimuth,
    satelliteElevation,
    azimuthDelta,
    elevationDelta,
    satelliteRange,
    nextPassTime,
    performanceStats: readonly(performanceStats),
    settings: readonly(settings),
    credentials: readonly(credentials),
    userLocation: readonly(userLocation),
    deviceOrientation: readonly(deviceOrientation),
    tleData: readonly(tleData),
    isLoading: readonly(tleLoading),
    isOffline: readonly(isOffline),
    cacheStatus: readonly(cacheStatus),

    // Methods
    calculateCurrentSatellitePosition,
    startTracking,
    stopTracking,
    initialize,
    getComprehensiveMetrics,
    clearAllCaches,
    cleanup,
    loadSettings
  }
}
