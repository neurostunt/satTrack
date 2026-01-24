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
  const { calculatePassesForSatellites, clearExpiredPasses } = usePassPrediction()
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
  const fetchTLEDataFromSatNOGS = async (satellites: Satellite[], _satnogsToken: string | null = null): Promise<TLEData[]> => {
    // Note: SatNOGS API doesn't require authentication for TLE read operations
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
            // token removed - not needed for read-only TLE operations
            action: 'tle',
            noradId: noradId
          })
        })

        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
          const tleRecord = data.data[0]
          
          // SatNOGS API returns TLE data in different formats - handle all possibilities
          const line1 = tleRecord.tle1 || tleRecord.tle_line1 || tleRecord.line1 || tleRecord.TLE_LINE1
          const line2 = tleRecord.tle2 || tleRecord.tle_line2 || tleRecord.line2 || tleRecord.TLE_LINE2
          
          if (line1 && line2) {
            tleData[noradId] = {
              noradId: noradId,
              line1: line1,
              line2: line2,
              timestamp: Date.now(),
              source: 'satnogs' as const
            }
            console.log(`✓ SatNOGS TLE data fetched for NORAD ${noradId}`)
          } else {
            console.warn(`✗ SatNOGS TLE data incomplete for NORAD ${noradId}:`, {
              hasLine1: !!line1,
              hasLine2: !!line2,
              recordKeys: Object.keys(tleRecord)
            })
          }
        } else {
          console.warn(`✗ No SatNOGS TLE data found for NORAD ${noradId}`, {
            success: data.success,
            hasData: !!data.data,
            dataLength: data.data?.length || 0
          })
        }
      } catch (error) {
        console.error(`✗ Error fetching SatNOGS TLE data for NORAD ${noradId}:`, error)
      }
    }

    const result = Object.values(tleData)
    if (result.length > 0 && result[0]) {
      console.log(`📦 SatNOGS fetch complete: ${result.length} TLE records`, 
        `Sample: NORAD ${result[0].noradId}, has line1: ${!!result[0].line1}, has line2: ${!!result[0].line2}`)
    } else {
      console.log(`📦 SatNOGS fetch complete: ${result.length} TLE records (no data)`)
    }
    return result
  }

  /**
   * Fetch TLE data from CelesTrak as tertiary backup
   */
  const fetchTLEDataFromCelesTrak = async (satellites: Satellite[]): Promise<TLEData[]> => {
    const tleData: Record<number, TLEData> = {}
    const noradIds = satellites.map(sat => sat.noradId)

    console.log('Fetching TLE data from CelesTrak backup for NORAD IDs:', noradIds)

    // Fetch TLE data for each satellite from CelesTrak
    for (const noradId of noradIds) {
      try {
        const response = await fetch('/api/celestrak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'tle',
            noradId: noradId
          })
        })

        const data = await response.json()

        if (data.success && data.data) {
          const tleRecord = data.data
          tleData[noradId] = {
            noradId: noradId,
            line1: tleRecord.tle1,
            line2: tleRecord.tle2,
            timestamp: Date.now(),
            source: 'celestrak' as const
          }
          console.log(`✓ CelesTrak TLE data fetched for NORAD ${noradId}`)
        } else {
          console.warn(`✗ No CelesTrak TLE data found for NORAD ${noradId}`)
        }
      } catch (error) {
        console.error(`✗ Error fetching CelesTrak TLE data for NORAD ${noradId}:`, error)
      }
    }

    return Object.values(tleData)
  }

  /**
   * Fetch TLE data for tracked satellites with multi-source fallback
   * Priority: Space-Track.org → SatNOGS DB → CelesTrak
   */
  const fetchTLEData = async (satellites: Satellite[], username: string, password: string, satnogsToken: string | null = null, forceRefresh: boolean = false): Promise<number> => {
    if (!satellites || satellites.length === 0) {
      console.warn('No satellites to fetch TLE data for')
      return 0
    }

    // Try to load from cache first if not forcing refresh
    if (!forceRefresh && !needsRefresh()) {
      const cacheLoaded = await loadFromCache()
      if (cacheLoaded) {
        console.log('Using cached TLE data')
        return Object.keys(tleData.value).length
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

          // Fallback to SatNOGS if Space-Track fails (no token required)
          try {
            rawTLEData = await fetchTLEDataFromSatNOGS(satellites, satnogsToken)
            dataSource = 'satnogs'
            console.log('✓ TLE data successfully fetched from SatNOGS backup')
          } catch (satnogsError) {
            console.warn('Both Space-Track.org and SatNOGS failed, trying CelesTrak...', (satnogsError as Error).message)

            // Tertiary fallback to CelesTrak
            try {
              rawTLEData = await fetchTLEDataFromCelesTrak(satellites)
              dataSource = 'celestrak'
              console.log('✓ TLE data successfully fetched from CelesTrak tertiary backup')
            } catch (celestrakError) {
              console.error('All three sources failed:', (celestrakError as Error).message)
              throw new Error(`TLE data fetch failed from all sources. Space-Track: ${(spaceTrackError as Error).message}, SatNOGS: ${(satnogsError as Error).message}, CelesTrak: ${(celestrakError as Error).message}`)
            }
          }
        }
      } else {
        // If no Space-Track credentials, use SatNOGS directly (no token required)
        console.log('No Space-Track credentials, fetching TLE data from SatNOGS...')
        rawTLEData = await fetchTLEDataFromSatNOGS(satellites, satnogsToken)
        dataSource = 'satnogs'
        console.log('✓ TLE data successfully fetched from SatNOGS')
      }

      // Process and store TLE data
      const processedData: Record<number, TLEData> = {}
      console.log(`📊 Processing ${rawTLEData.length} TLE records from ${dataSource}`)
      
      rawTLEData.forEach((tle, index) => {
        // Debug: Log first few records structure to understand data format
        if (index < 3) {
          console.log(`🔍 TLE record ${index} structure:`, {
            hasLine1: !!(tle as any).line1,
            hasLine2: !!(tle as any).line2,
            hasNoradId: !!(tle as any).noradId,
            hasTLE_LINE1: !!(tle as any).TLE_LINE1,
            hasTLE_LINE2: !!(tle as any).TLE_LINE2,
            hasTle1: !!(tle as any).tle1,
            hasTle2: !!(tle as any).tle2,
            hasNoradCatId: !!(tle as any).norad_cat_id,
            hasNORAD_CAT_ID: !!(tle as any).NORAD_CAT_ID,
            keys: Object.keys(tle).slice(0, 10) // First 10 keys
          })
        }
        
        // Check if data is already in TLEData format (from SatNOGS or CelesTrak fallback functions)
        // This happens when fetchTLEDataFromSatNOGS or fetchTLEDataFromCelesTrak returns processed data
        if ((tle as any).line1 && (tle as any).line2 && (tle as any).noradId) {
          // Already processed TLEData format - use directly
          const noradId = (tle as any).noradId
          processedData[noradId] = {
            noradId: noradId,
            line1: (tle as any).line1,
            line2: (tle as any).line2,
            timestamp: (tle as any).timestamp || Date.now(),
            source: (tle as any).source || dataSource as 'space-track' | 'satnogs' | 'celestrak' | 'manual'
          }
          if (index < 3) {
            console.log(`✅ Using pre-processed TLEData format for NORAD ${noradId}`)
          }
          return
        }

        // Handle raw API response formats (Space-Track, or unprocessed SatNOGS/CelesTrak)
        // Space-Track uses: NORAD_CAT_ID, TLE_LINE1, TLE_LINE2
        // SatNOGS uses: norad_cat_id, tle1, tle2 (but should be caught above if already processed)
        const noradId = (tle as any).NORAD_CAT_ID || (tle as any).norad_cat_id || (tle as any).noradId
        const _name = (tle as any).OBJECT_NAME || (tle as any).tle0 || `Satellite ${noradId}`
        const tle1 = (tle as any).TLE_LINE1 || (tle as any).tle1
        const tle2 = (tle as any).TLE_LINE2 || (tle as any).tle2
        const _epoch = (tle as any).EPOCH || (tle as any).updated

        if (!noradId || !tle1 || !tle2) {
          console.warn(`⚠️ Skipping incomplete TLE data (record ${index}):`, { 
            noradId, 
            hasLine1: !!tle1, 
            hasLine2: !!tle2,
            hasNoradId: !!noradId,
            dataSource,
            dataKeys: Object.keys(tle),
            sampleData: JSON.stringify(tle).substring(0, 300)
          })
          return
        }

        processedData[noradId] = {
          noradId: noradId,
          line1: tle1,
          line2: tle2,
          timestamp: Date.now(),
          source: (tle as any).source || dataSource as 'space-track' | 'satnogs' | 'celestrak' | 'manual'
        }
      })
      
      console.log(`✅ Processed ${Object.keys(processedData).length} TLE records into processedData (from ${rawTLEData.length} raw records)`)

      // Check if any satellites are missing TLE data and try fallback sources individually
      const missingSatellites = satellites.filter(sat => !processedData[sat.noradId])

      if (missingSatellites.length > 0) {
        console.log(`⚠️ ${missingSatellites.length} satellites missing TLE data, trying fallback sources...`)
        console.log(`   Missing: ${missingSatellites.map(s => `${s.name} (${s.noradId})`).join(', ')}`)

        // Try SatNOGS for missing satellites (if not already tried)
        if (dataSource !== 'satnogs') {
          try {
            const satnogsData = await fetchTLEDataFromSatNOGS(missingSatellites, satnogsToken)
            satnogsData.forEach(tle => {
              processedData[tle.noradId] = tle
              console.log(`✓ Found TLE for ${satellites.find(s => s.noradId === tle.noradId)?.name} (${tle.noradId}) via SatNOGS`)
            })
          } catch (error) {
            console.warn('SatNOGS fallback failed:', (error as Error).message)
          }
        }

        // Try CelesTrak for still-missing satellites
        const stillMissing = satellites.filter(sat => !processedData[sat.noradId])
        if (stillMissing.length > 0) {
          try {
            console.log(`   Trying CelesTrak for ${stillMissing.length} satellites: ${stillMissing.map(s => s.name).join(', ')}`)
            const celestrakData = await fetchTLEDataFromCelesTrak(stillMissing)
            celestrakData.forEach(tle => {
              processedData[tle.noradId] = tle
              console.log(`✓ Found TLE for ${satellites.find(s => s.noradId === tle.noradId)?.name} (${tle.noradId}) via CelesTrak`)
            })
          } catch (error) {
            console.warn('CelesTrak fallback failed:', (error as Error).message)
          }
        }

        // Final report
        const finalMissing = satellites.filter(sat => !processedData[sat.noradId])
        if (finalMissing.length > 0) {
          console.error(`❌ Could not find TLE data for ${finalMissing.length} satellites:`)
          finalMissing.forEach(sat => console.error(`   - ${sat.name} (NORAD ${sat.noradId})`))
        }
      }

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
      }, settings.value.n2yoApiKey)
      console.log('✅ calculatePassPredictionsAfterTLEUpdate completed')

      const fetchedCount = Object.keys(processedData).length
      console.log(`TLE data updated successfully from ${dataSource}:`, fetchedCount, 'satellites')
      return fetchedCount

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
        return Object.keys(tleData.value).length
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
    observerLocation?: { lat: number; lng: number; alt: number },
    n2yoApiKey?: string
  ): Promise<void> => {
    console.log('🚀 calculatePassPredictionsAfterTLEUpdate called!')
    console.log('🚀 Satellites count:', satellites.length)
    console.log('🚀 Processed data keys:', Object.keys(processedData))
    console.log('🚀 Observer location passed:', observerLocation)

    try {
      console.log('🛰️ Starting pass prediction calculations after TLE update...')

      // Check if N2YO API key is available
      if (!n2yoApiKey) {
        console.warn('⚠️ N2YO API key not available, skipping pass predictions')
        passPredictionStatus.value = {
          show: true,
          status: 'error',
          message: 'N2YO API key not configured - pass predictions disabled',
          progress: 'Please configure N2YO API key in Settings'
        }
        return
      }

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

      // Clear expired passes from cache before calculating new ones
      console.log('🧹 Clearing expired passes before calculating new predictions...')
      await clearExpiredPasses()

      // Calculate passes for all satellites
      console.log(`🔄 About to calculate passes for ${satellitesWithTLE.length} satellites`)
      console.log(`🔄 Observer location:`, location)
      console.log(`🔄 Satellites with TLE:`, satellitesWithTLE.map(s => ({ noradId: s.noradId, hasTLE: !!s.tleData })))

      await calculatePassesForSatellites(satellitesWithTLE, location, 10, n2yoApiKey || '')

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
