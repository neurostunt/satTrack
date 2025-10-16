/**
 * TLE Data Composable
 * Manages satellite TLE data fetching and caching with secure storage
 */

import { ref, readonly } from 'vue'
import { useSpaceTrack } from './useSpaceTrack'
import { useSecureStorage } from '../storage/useSecureStorage'
import { usePassPrediction } from '../satellite/usePassPrediction'
import { useSettings } from '../storage/useSettings'
import type { TLEData, Satellite } from '~/types/satellite'

export const useTLEData = () => {
  const tleData = ref<Record<number, TLEData>>({})
  const isLoading = ref<boolean>(false)
  const lastUpdate = ref<number | null>(null)
  const error = ref<string | null>(null)
  const isOffline = ref<boolean>(false)
  const cacheStatus = ref<'none' | 'fresh' | 'stale' | 'offline'>('none')

  // Pass prediction progress state
  const passPredictionStatus = ref<{
    show: boolean
    status: 'loading' | 'success' | 'error'
    message: string
    progress: string
    countdown?: string
  }>({
    show: true, // Always show
    status: 'success',
    message: 'Pass predictions calculated: 0 satellites',
    progress: 'Data cached for offline use',
    countdown: '2:00:00'
  })

  // Countdown timer for refresh cycle
  const countdownInterval = ref<NodeJS.Timeout | null>(null)
  const refreshTime = ref<number | null>(null)

  // Start countdown timer
  const startCountdown = () => {
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value)
    }

    refreshTime.value = Date.now() + (2 * 60 * 60 * 1000) // 2 hours from now

    countdownInterval.value = setInterval(() => {
      if (refreshTime.value) {
        const remaining = refreshTime.value - Date.now()
        if (remaining <= 0) {
          // Countdown finished
          passPredictionStatus.value.countdown = '00:00:00'
          if (countdownInterval.value) {
            clearInterval(countdownInterval.value)
            countdownInterval.value = null
          }
        } else {
          // Update countdown
          const hours = Math.floor(remaining / (1000 * 60 * 60))
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
          passPredictionStatus.value.countdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
      }
    }, 1000)
  }

  // Stop countdown timer
  const stopCountdown = () => {
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value)
      countdownInterval.value = null
    }
  }

  // Use composables
  const spaceTrack = useSpaceTrack()
  const storage = useSecureStorage()
  const { calculatePassesForSatellites } = usePassPrediction()
  const { settings } = useSettings()

  /**
   * Load TLE data from cache
   * @returns {Promise<boolean>} - Success status
   */
  const loadFromCache = async () => {
    try {
      const cacheData = await storage.getTLEData()
      if (cacheData && cacheData.length > 0) {
        // Convert array to object keyed by NORAD ID
        const tleObject: Record<number, TLEData> = {}
        cacheData.forEach((tle: TLEData) => {
          tleObject[tle.noradId] = tle
        })

        tleData.value = tleObject
        lastUpdate.value = Date.now()

        // Determine cache status
        const ageMinutes = (Date.now() - (cacheData[0]?.timestamp || 0)) / (1000 * 60)

        if (ageMinutes < 30) {
          cacheStatus.value = 'fresh'
        } else if (ageMinutes < 360) { // 6 hours
          cacheStatus.value = 'stale'
        } else {
          cacheStatus.value = 'stale'
        }

        console.log(`Loaded ${cacheData.length} TLE entries from cache (${cacheStatus.value})`)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to load from cache:', error)
      return false
    }
  }

  /**
   * Save TLE data to cache
   */
  const saveToCache = async (data: Record<number, TLEData>): Promise<void> => {
    try {
      // Convert object to array for storage
      const tleArray = Object.values(data)
      await storage.storeTLEData(tleArray)
      console.log('TLE data saved to cache')
    } catch (error) {
      console.error('Failed to save to cache:', error)
    }
  }

  /**
   * Check if TLE data needs refresh
   */
  const needsRefresh = (): boolean => {
    if (!lastUpdate.value) return true

    const updateTime = new Date(lastUpdate.value)
    const now = new Date()
    const ageMinutes = (now.getTime() - updateTime.getTime()) / (1000 * 60)

    // Refresh if older than 2 hours
    return ageMinutes > 120
  }
  /**
   * Fetch TLE data from SatNOGS as backup
   */
  const fetchTLEDataFromSatNOGS = async (satellites: Satellite[], satnogsToken: string): Promise<TLEData[]> => {
    if (!satnogsToken) {
      throw new Error('SatNOGS API token is required for backup TLE data')
    }

    const tleData: Record<number, TLEData> = {}
    const noradIds = satellites.map(sat => sat.noradId)

    console.log('Fetching TLE data from SatNOGS backup for NORAD IDs:', noradIds)

    // Fetch TLE data for each satellite from SatNOGS
    for (const noradId of noradIds) {
      try {
        const response = await fetch('/api/satnogs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: satnogsToken,
            action: 'tle',
            noradId: noradId
          })
        })

        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
          const tleRecord = data.data[0]
          tleData[noradId] = {
            noradId: noradId,
            line1: tleRecord.tle1,
            line2: tleRecord.tle2,
            timestamp: Date.now(),
            source: 'satnogs' as const
          }
          console.log(`✓ SatNOGS TLE data fetched for NORAD ${noradId}`)
        } else {
          console.warn(`✗ No SatNOGS TLE data found for NORAD ${noradId}`)
        }
      } catch (error) {
        console.error(`✗ Error fetching SatNOGS TLE data for NORAD ${noradId}:`, error)
      }
    }

    return Object.values(tleData)
  }

  /**
   * Fetch TLE data for tracked satellites with hybrid approach (Space-Track primary, SatNOGS backup)
   */
  const fetchTLEData = async (satellites: Satellite[], username: string, password: string, satnogsToken: string | null = null, forceRefresh: boolean = false): Promise<void> => {
    if (!satellites || satellites.length === 0) {
      console.warn('No satellites to fetch TLE data for')
      return
    }

    // Try to load from cache first if not forcing refresh
    if (!forceRefresh && !needsRefresh()) {
      const cacheLoaded = await loadFromCache()
      if (cacheLoaded) {
        console.log('Using cached TLE data')
        return
      }
    }

    isLoading.value = true
    error.value = null
    isOffline.value = false

    try {
      let rawTLEData = []
      let dataSource = 'unknown'

      // Try Space-Track.org first (primary source)
      if (username && password) {
        try {
          console.log('Attempting to fetch TLE data from Space-Track.org (primary source)...')

          // Login if not already logged in
          if (!spaceTrack.getSessionStatus()) {
            const loginSuccess = await spaceTrack.login(username, password)
            if (!loginSuccess) {
              throw new Error('Failed to login to Space-Track.org')
            }
          }

          // Extract NORAD IDs
          const noradIds = satellites.map(sat => sat.noradId)

          // Fetch TLE data from Space-Track.org
          rawTLEData = await spaceTrack.fetchTLEData(noradIds, username, password)

          // Check if Space-Track returned empty data
          if (!rawTLEData || rawTLEData.length === 0) {
            console.warn('Space-Track.org returned empty data, trying SatNOGS backup...')
            throw new Error('Space-Track.org returned no TLE data')
          }

          dataSource = 'space-track'
          console.log('✓ TLE data successfully fetched from Space-Track.org')
        } catch (spaceTrackError) {
          console.warn('Space-Track.org failed, trying SatNOGS backup:', (spaceTrackError as Error).message)

          // Fallback to SatNOGS if Space-Track fails
          if (satnogsToken) {
            try {
              rawTLEData = await fetchTLEDataFromSatNOGS(satellites, satnogsToken)
              dataSource = 'satnogs'
              console.log('✓ TLE data successfully fetched from SatNOGS backup')
            } catch (satnogsError) {
              console.error('Both Space-Track.org and SatNOGS failed:', (satnogsError as Error).message)
              throw new Error(`TLE data fetch failed from both sources. Space-Track: ${(spaceTrackError as Error).message}, SatNOGS: ${(satnogsError as Error).message}`)
            }
          } else {
            throw new Error(`Space-Track.org failed and no SatNOGS token provided for backup: ${(spaceTrackError as Error).message}`)
          }
        }
      } else if (satnogsToken) {
        // If no Space-Track credentials, try SatNOGS directly
        console.log('No Space-Track credentials, fetching TLE data from SatNOGS...')
        rawTLEData = await fetchTLEDataFromSatNOGS(satellites, satnogsToken)
        dataSource = 'satnogs'
        console.log('✓ TLE data successfully fetched from SatNOGS')
      } else {
        throw new Error('Either Space-Track.org credentials or SatNOGS token is required')
      }

      // Process and store TLE data
      const processedData: Record<number, TLEData> = {}
      rawTLEData.forEach(tle => {
        // Handle different data formats from Space-Track vs SatNOGS
        const noradId = (tle as any).NORAD_CAT_ID || (tle as any).norad_cat_id
        const name = (tle as any).OBJECT_NAME || (tle as any).tle0 || `Satellite ${noradId}`
        const tle1 = (tle as any).TLE_LINE1 || (tle as any).tle1
        const tle2 = (tle as any).TLE_LINE2 || (tle as any).tle2
        const epoch = (tle as any).EPOCH || (tle as any).updated

        processedData[noradId] = {
          noradId: noradId,
          line1: tle1,
          line2: tle2,
          timestamp: Date.now(),
          source: dataSource as 'space-track' | 'satnogs' | 'manual'
        }
      })

      tleData.value = processedData
      lastUpdate.value = Date.now()
      cacheStatus.value = 'fresh'

      // Save to cache
      await saveToCache(processedData)
      console.log('💾 TLE data saved to cache, about to calculate pass predictions...')

      // Calculate pass predictions after TLE data is updated
      console.log('🛰️ Calling calculatePassPredictionsAfterTLEUpdate...')
      await calculatePassPredictionsAfterTLEUpdate(satellites, processedData, {
        lat: settings.value.observationLocation?.latitude || 40.7128,
        lng: settings.value.observationLocation?.longitude || -74.0060,
        alt: settings.value.observationLocation?.altitude || 0
      })
      console.log('✅ calculatePassPredictionsAfterTLEUpdate completed')

      console.log(`TLE data updated successfully from ${dataSource}:`, Object.keys(processedData).length, 'satellites')

    } catch (err) {
      console.error('TLE data fetch failed:', err instanceof Error ? err.message : 'Unknown error')
      error.value = err instanceof Error ? err.message : 'Unknown error'

      // Try to load from cache as fallback
      const cacheLoaded = await loadFromCache()
      if (cacheLoaded) {
        console.log('Using cached data as fallback')
        isOffline.value = true
        cacheStatus.value = 'offline'
        error.value = `Network error: ${err instanceof Error ? err.message : 'Unknown error'}. Using cached data.`
      } else {
        throw err
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get TLE data for a specific satellite
   */
  const getTLEData = (noradId: number): TLEData | null => {
    return tleData.value[noradId] || null
  }

  /**
   * Check if TLE data is available for a satellite
   */
  const hasTLEData = (noradId: number): boolean => {
    return !!tleData.value[noradId]
  }

  /**
   * Get all available TLE data
   */
  const getAllTLEData = (): Record<number, TLEData> => {
    return tleData.value
  }

  /**
   * Clear all TLE data and cache
   */
  const clearTLEData = (): void => {
    tleData.value = {}
    lastUpdate.value = null
    error.value = null
    isOffline.value = false
    cacheStatus.value = 'none'
    storage.clearAll()
  }

  /**
   * Initialize TLE data (load from cache or fetch)
   */
  const initializeTLEData = async (satellites: Satellite[], username: string, password: string): Promise<void> => {
    // Try to load from cache first
    const cacheLoaded = await loadFromCache()
    if (cacheLoaded) {
      console.log('TLE data initialized from cache')
      return
    }

    // If no cache or cache is stale, fetch fresh data
    if (username && password) {
      try {
        await fetchTLEData(satellites, username, password)
      } catch (error) {
        console.error('Failed to initialize TLE data:', error)
      }
    }
  }

  /**
   * Get data freshness info
   */
  const getDataFreshness = () => {
    if (!lastUpdate.value) {
      return {
        isFresh: false,
        age: null,
        status: cacheStatus.value,
        isOffline: isOffline.value
      }
    }

    const now = new Date()
    const updateTime = new Date(lastUpdate.value)
    const ageMinutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60))

    return {
      isFresh: ageMinutes < 30, // Consider fresh if less than 30 minutes old
      age: ageMinutes,
      lastUpdate: lastUpdate.value,
      status: cacheStatus.value,
      isOffline: isOffline.value,
      needsRefresh: ageMinutes > 120 // Refresh if older than 2 hours
    }
  }

  /**
   * Force refresh TLE data
   */
  const refreshTLEData = async (satellites: Satellite[], username: string, password: string, satnogsToken: string | null = null): Promise<void> => {
    // Reset countdown when refresh is triggered
    stopCountdown()
    await fetchTLEData(satellites, username, password, satnogsToken, true)
  }

  /**
   * Calculate pass predictions after TLE data is updated
   */
  const calculatePassPredictionsAfterTLEUpdate = async (
    satellites: Satellite[],
    processedData: Record<number, TLEData>,
    observerLocation?: { lat: number; lng: number; alt: number }
  ): Promise<void> => {
    console.log('🚀 calculatePassPredictionsAfterTLEUpdate called!')
    console.log('🚀 Satellites count:', satellites.length)
    console.log('🚀 Processed data keys:', Object.keys(processedData))
    console.log('🚀 Observer location passed:', observerLocation)

    try {
      console.log('🛰️ Starting pass prediction calculations after TLE update...')

      // Show progress indicator
      passPredictionStatus.value = {
        show: true,
        status: 'loading',
        message: 'Calculating pass predictions...',
        progress: 'Processing satellite orbits'
      }

      // Use passed observer location or fallback to settings/default
      const location = observerLocation || {
        lat: settings.value.observationLocation?.latitude || 40.7128,
        lng: settings.value.observationLocation?.longitude || -74.0060,
        alt: settings.value.observationLocation?.altitude || 0
      }

      console.log('🛰️ Using observer location:', location)

      // Prepare satellite data with TLE for pass calculation
      const satellitesWithTLE = satellites
        .filter(satellite => processedData[satellite.noradId])
        .map(satellite => ({
          noradId: satellite.noradId,
          tleData: processedData[satellite.noradId]
        }))

      if (satellitesWithTLE.length === 0) {
        console.log('⚠️ No satellites with TLE data for pass calculation')
        passPredictionStatus.value = {
          show: true,
          status: 'error',
          message: 'No satellites with TLE data for pass calculation',
          progress: ''
        }
        return
      }

      console.log(`📊 Calculating passes for ${satellitesWithTLE.length} satellites`)

      // Update progress
      passPredictionStatus.value = {
        show: true,
        status: 'loading',
        message: `Calculating passes for ${satellitesWithTLE.length} satellites...`,
        progress: 'Processing orbital mechanics'
      }

      // Calculate passes for all satellites
      console.log(`🔄 About to calculate passes for ${satellitesWithTLE.length} satellites`)
      console.log(`🔄 Observer location:`, location)
      console.log(`🔄 Satellites with TLE:`, satellitesWithTLE.map(s => ({ noradId: s.noradId, hasTLE: !!s.tleData })))

      await calculatePassesForSatellites(satellitesWithTLE, location)

      console.log(`✅ Pass predictions successfully calculated for ${satellitesWithTLE.length} satellites`)

      // Show success status and start countdown
      passPredictionStatus.value = {
        show: true,
        status: 'success',
        message: `Pass predictions calculated: ${satellitesWithTLE.length} satellites`,
        progress: 'Data cached for offline use',
        countdown: '2:00:00'
      }

      // Start countdown timer
      startCountdown()

    } catch (error) {
      console.error('❌ Failed to calculate pass predictions after TLE update:', error)
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      // Show error status
      passPredictionStatus.value = {
        show: true,
        status: 'error',
        message: `Pass prediction calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 'TLE data still available',
        countdown: '2:00:00'
      }

      // Don't throw error - pass prediction failure shouldn't break TLE data fetching
    }
  }

  return {
    // State
    tleData: readonly(tleData),
    isLoading: readonly(isLoading),
    lastUpdate: readonly(lastUpdate),
    error: readonly(error),
    isOffline: readonly(isOffline),
    cacheStatus: readonly(cacheStatus),
    passPredictionStatus: readonly(passPredictionStatus),

    // Methods
    fetchTLEData,
    getTLEData,
    hasTLEData,
    getAllTLEData,
    clearTLEData,
    getDataFreshness,
    initializeTLEData,
    refreshTLEData,
    loadFromCache,
    saveToCache,
    needsRefresh,
    startCountdown,
    stopCountdown
  }
}
