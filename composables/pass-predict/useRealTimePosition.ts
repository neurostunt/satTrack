/**
 * Real-Time Position Composable
 * Handles fetching and interpolating satellite positions during a pass
 *
 * Strategy: Fetch 300s (5 min) of positions at once, interpolate for smooth animation
 * API Usage: ~2 requests per 10-minute pass (85% reduction from 60s strategy)
 *
 * N2YO API Limits:
 * - 1000 requests per hour for positions endpoint
 * - Maximum 300 seconds per request
 */

import { calculateDistance, calculateRadialVelocity } from '~/utils/dopplerCalculations'
import { useN2YO } from '../api/useN2YO'

export interface SatellitePosition {
  timestamp: number // Unix timestamp in milliseconds
  azimuth: number // Degrees (0-360)
  elevation: number // Degrees (0-90)
  distance: number // Distance to satellite (km)
  satLatitude: number // Satellite latitude
  satLongitude: number // Satellite longitude
  satAltitude: number // Satellite altitude above Earth (km)
}

// Module-level cache for position data (shared across component instances)
interface PositionCache {
  noradId: number
  positions: SatellitePosition[]
  fetchTime: number
  observerLocation: { lat: number; lng: number; alt: number }
}

const positionCache = new Map<number, PositionCache>()

export const useRealTimePosition = () => {
  // Current real-time position
  const currentPosition = ref<SatellitePosition | null>(null)

  // Position history (last 5 minutes for path drawing)
  const positionHistory = ref<SatellitePosition[]>([])

  // Future positions from API (buffer for smooth animation)
  const futurePositions = ref<SatellitePosition[]>([])

  // Tracking state
  const isTracking = ref(false)
  const lastFetchTime = ref(0)

  // Server-side timestamp for consistent time calculations across devices
  // This is updated when we fetch positions from the API
  const serverTimestamp = ref<number>(0)
  const serverTimestampOffset = ref<number>(0) // Offset between server and client time

  // Radial velocity (km/s)
  const radialVelocity = ref<number>(0)

  // Observer location (stored for distance calculations)
  const observerLocation = ref<{ lat: number; lng: number; alt: number } | null>(null)

  // Animation frame ID for cleanup
  let animationFrameId: number | null = null
  let isFetching = ref(false) // Prevent duplicate fetches

  /**
   * Start tracking a satellite during its pass
   *
   * ⚠️ IMPORTANT: Should only be called when:
   * 1. User has expanded the pass card (actively viewing)
   * 2. Satellite is currently passing (within pass window)
   *
   * This prevents unnecessary API calls and saves rate limit quota.
   * Fetches 300s of position data every 270 seconds (4.5 min).
   */
  const startTracking = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    apiKey: string
  ) => {
    // Prevent duplicate tracking
    if (isTracking.value) {
      console.warn(`⚠️ Already tracking NORAD ${noradId} - ignoring duplicate start request`)
      return
    }

    // Validate API key
    if (!apiKey) {
      console.error(`❌ Cannot start tracking: N2YO API key is missing`)
      return
    }


    isTracking.value = true
    positionHistory.value = []
    futurePositions.value = []
    radialVelocity.value = 0

    // Store observer location for distance calculations
    observerLocation.value = {
      lat: observerLat,
      lng: observerLng,
      alt: observerAlt
    }

    // Fetch initial positions
    await fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)

    // Start animation loop for smooth interpolation
    startAnimation(noradId, observerLat, observerLng, observerAlt, apiKey)
  }

  /**
   * Stop tracking (when pass ends or user closes visualization)
   *
   * Called automatically when:
   * - User collapses the pass card
   * - Pass ends (satellite no longer visible)
   * - Component is unmounted
   */
  const stopTracking = () => {
    if (!isTracking.value) {
      // Already stopped, nothing to do
      return
    }


    isTracking.value = false

    // Clear animation frame
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    // Reset fetching state
    isFetching.value = false

    // Clear position data (but keep cache for reuse)
    currentPosition.value = null
    positionHistory.value = []
    futurePositions.value = [] // Will be repopulated from cache if reopened
    radialVelocity.value = 0
    serverTimestamp.value = 0
    serverTimestampOffset.value = 0
    // Don't clear observerLocation - keep for next time
  }

  /**
   * Fetch satellite positions from N2YO API
   * Gets 300 seconds (5 minutes) worth of positions (one position per second)
   * This maximizes API efficiency while staying within the 300s limit
   *
   * Uses server-side timestamp for all time calculations to ensure consistency
   * across devices. This eliminates differences due to system clock drift or
   * timezone differences between devices.
   */
  const fetchPositions = async (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    apiKey: string
  ) => {
    // Prevent duplicate fetches
    if (isFetching.value) {
      return
    }

    try {
      isFetching.value = true
      // Calculate current server time for consistent calculations
      // Use server-side timestamp if available, otherwise fallback to client time
      const clientNow = Date.now()
      const currentServerTime = serverTimestamp.value > 0
        ? clientNow + serverTimestampOffset.value
        : clientNow

      // Check cache first
      const cached = positionCache.get(noradId)
      if (cached) {
        const hasFutureData = cached.positions.some(pos => pos.timestamp > currentServerTime)

        // Use cache if:
        // 1. It still has future position data
        // 2. Observer location hasn't changed significantly
        const locationMatch =
          Math.abs(cached.observerLocation.lat - observerLat) < 0.01 &&
          Math.abs(cached.observerLocation.lng - observerLng) < 0.01

        if (hasFutureData && locationMatch) {
          // Filter cached positions to only include future ones from current server time
          const futurePositionsFromCache = cached.positions.filter(pos => pos.timestamp >= currentServerTime)

          // When tab opens mid-pass, also extract past positions from cache to show complete path
          const pastThreshold = currentServerTime - 1000 // 1 second ago
          const pastPositionsFromCache = cached.positions.filter(pos =>
            pos.timestamp < pastThreshold &&
            pos.timestamp > (currentServerTime - 5 * 60 * 1000) // Last 5 minutes only
          )

          // Add past positions to history if they don't already exist
          if (pastPositionsFromCache.length > 0) {
            const existingHistoryTimestamps = new Set(positionHistory.value.map(p => p.timestamp))
            const newPastPositions = pastPositionsFromCache.filter(pos => !existingHistoryTimestamps.has(pos.timestamp))
            if (newPastPositions.length > 0) {
              positionHistory.value.push(...newPastPositions)
              // Keep only last 5 minutes of history
              const fiveMinutesAgo = currentServerTime - (5 * 60 * 1000)
              positionHistory.value = positionHistory.value.filter(pos => pos.timestamp > fiveMinutesAgo)
              // Sort history by timestamp
              positionHistory.value.sort((a, b) => a.timestamp - b.timestamp)
            }
          }

          // Merge with any existing buffer
          const existingFuture = futurePositions.value.filter(pos => pos.timestamp >= currentServerTime)
          const newPositions = futurePositionsFromCache.filter(pos =>
            !existingFuture.some(existing => existing.timestamp === pos.timestamp)
          )

          futurePositions.value = [...existingFuture, ...newPositions].sort((a, b) => a.timestamp - b.timestamp)

          return // Skip API call
        }
      }

      const { getSatellitePositions } = useN2YO()

      const positions = await getSatellitePositions(
        noradId,
        observerLat,
        observerLng,
        observerAlt,
        300, // Get 300 seconds (5 min) - maximum allowed by N2YO API
        apiKey
      )

      // Get server-side timestamp from positions array (added by useN2YO)
      // Use server-side timestamp for all time calculations to ensure consistency across devices
      const fetchedServerTimestamp = (positions as any).serverTimestamp || Date.now()
      const clientTime = Date.now()

      // Update server timestamp and calculate offset for future calculations
      serverTimestamp.value = fetchedServerTimestamp
      serverTimestampOffset.value = fetchedServerTimestamp - clientTime

      console.log(`🕐 Server timestamp: ${new Date(fetchedServerTimestamp).toISOString()}, Client offset: ${serverTimestampOffset.value}ms`)

      // Calculate distance for each position
      if (observerLocation.value) {
        positions.forEach((pos: SatellitePosition) => {
          pos.distance = calculateDistance(
            observerLocation.value!.lat,
            observerLocation.value!.lng,
            observerLocation.value!.alt,
            pos.satLatitude,
            pos.satLongitude,
            pos.satAltitude
          )
        })
      }

      // Merge with existing buffer, removing any overlaps
      // The animation loop moves consumed positions to history, so we combine remaining + new
      // Use server-side timestamp for consistent time calculations across devices
      const currentTime = fetchedServerTimestamp
      const existingFuture = futurePositions.value.filter((pos: SatellitePosition) => pos.timestamp >= currentTime)

      // Only add new positions that don't overlap with existing ones
      const newPositions = positions.filter((pos: SatellitePosition) =>
        !existingFuture.some((existing: SatellitePosition) => existing.timestamp === pos.timestamp)
      )

      // Merge and sort by timestamp to ensure proper ordering
      const allMergedPositions = [...existingFuture, ...newPositions].sort((a, b) => a.timestamp - b.timestamp)

      // When tab opens mid-pass, some positions in futurePositions may be in the past
      // Move past positions to history immediately so they can be drawn as part of the green path
      const pastThreshold = currentTime - 1000 // 1 second ago (to account for timing differences)
      const pastPositions = allMergedPositions.filter(pos => pos.timestamp < pastThreshold)
      const futurePositionsOnly = allMergedPositions.filter(pos => pos.timestamp >= pastThreshold)

      // Add past positions to history if they don't already exist
      if (pastPositions.length > 0) {
        const existingHistoryTimestamps = new Set(positionHistory.value.map(p => p.timestamp))
        const newPastPositions = pastPositions.filter(pos => !existingHistoryTimestamps.has(pos.timestamp))
        if (newPastPositions.length > 0) {
          positionHistory.value.push(...newPastPositions)
          // Keep only last 5 minutes of history
          const fiveMinutesAgo = currentTime - (5 * 60 * 1000)
          positionHistory.value = positionHistory.value.filter(pos => pos.timestamp > fiveMinutesAgo)
          // Sort history by timestamp
          positionHistory.value.sort((a, b) => a.timestamp - b.timestamp)
        }
      }

      futurePositions.value = futurePositionsOnly
      lastFetchTime.value = currentTime // Use server-side timestamp

      // Store in cache for reuse
      positionCache.set(noradId, {
        noradId,
        positions: positions,
        fetchTime: currentTime, // Use server-side timestamp
        observerLocation: {
          lat: observerLat,
          lng: observerLng,
          alt: observerAlt
        }
      })


    } catch (error) {
      console.error('❌ Failed to fetch satellite positions:', error)
    } finally {
      isFetching.value = false
    }
  }

  /**
   * Animation loop - updates current position smoothly
   * Runs at 60fps for smooth visualization
   * Automatically fetches more positions when buffer gets low
   */
  const startAnimation = (
    noradId: number,
    observerLat: number,
    observerLng: number,
    observerAlt: number,
    apiKey: string
  ) => {
    const animate = () => {
      if (!isTracking.value) return

      // Use server-side timestamp for position calculations to ensure consistency across devices
      // Calculate current server time based on offset from last fetch
      const clientNow = Date.now()
      const serverNow = serverTimestamp.value > 0
        ? clientNow + serverTimestampOffset.value
        : clientNow // Fallback to client time if server timestamp not available

      // Check buffer status and fetch more positions if running low or exhausted
      // Fetch when less than 90 seconds of data remain OR buffer is exhausted
      if (futurePositions.value.length > 0 && !isFetching.value) {
        const latestPosition = futurePositions.value[futurePositions.value.length - 1]
        if (latestPosition) {
          const timeRemaining = (latestPosition.timestamp - serverNow) / 1000 // seconds

          // Fetch if buffer is low (< 90s) OR already exhausted (< 0s)
          if (timeRemaining < 90) {
            fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)
          }
        }
      } else if (futurePositions.value.length === 0 && !isFetching.value && currentPosition.value) {
        // Buffer completely empty but we have a last position - fetch immediately
        fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)
      }

      // Find the current position from future positions buffer
      if (futurePositions.value.length > 0) {
        // Find position closest to current time (or interpolate between two positions)
        // Use server-side timestamp for consistent position calculations
        const futureIdx = futurePositions.value.findIndex(pos => pos.timestamp >= serverNow)

        if (futureIdx >= 0) {
          const futurePos = futurePositions.value[futureIdx]

          if (!futurePos) return

          // Interpolate between previous and current position for smoother animation
          if (futureIdx > 0) {
            const prevPos = futurePositions.value[futureIdx - 1]

            if (prevPos) {
              const timeDiff = futurePos.timestamp - prevPos.timestamp
              const timeProgress = (serverNow - prevPos.timestamp) / timeDiff

              // Interpolate for smooth movement
              const interpolatedPos = interpolatePosition(prevPos, futurePos, timeProgress)

              // Calculate radial velocity
              if (currentPosition.value && currentPosition.value.distance > 0 && interpolatedPos.distance > 0) {
                const timeDiffSeconds = (interpolatedPos.timestamp - currentPosition.value.timestamp) / 1000
                if (timeDiffSeconds > 0) {
                  radialVelocity.value = calculateRadialVelocity(
                    currentPosition.value.distance,
                    interpolatedPos.distance,
                    timeDiffSeconds
                  )
                }
              }

              currentPosition.value = interpolatedPos
            } else {
              // Fallback if prevPos is undefined
              currentPosition.value = futurePos
            }
          } else {
            // First position, no interpolation
            currentPosition.value = futurePos
          }

          // Move consumed positions to history (only move fully consumed ones)
          // Use server-side timestamp for consistent time calculations
          const consumedPositions = futurePositions.value.filter(pos => pos.timestamp < (serverNow - 1000))
          if (consumedPositions.length > 0) {
            positionHistory.value.push(...consumedPositions)
            futurePositions.value = futurePositions.value.filter(pos => pos.timestamp >= (serverNow - 1000))

            // Keep only last 5 minutes of history (300 positions max)
            const fiveMinutesAgo = serverNow - (5 * 60 * 1000)
            positionHistory.value = positionHistory.value.filter(pos => pos.timestamp > fiveMinutesAgo)
          }
        } else {
          // All positions are in the past, hold the last known position while fetching
          const lastPosition = futurePositions.value[futurePositions.value.length - 1]
          if (lastPosition) {
            currentPosition.value = lastPosition
            // Note: Fetch is triggered above, so we're just holding position temporarily
          }
        }
      } else if (currentPosition.value) {
        // No positions in buffer but we have a last position - keep showing it
        // Fetch is triggered above
      }

      // Continue animation
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
  }

  /**
   * Interpolate between two positions for smooth animation
   * Used when we need to fill gaps between API samples
   */
  const interpolatePosition = (
    pos1: SatellitePosition,
    pos2: SatellitePosition,
    t: number // 0 to 1
  ): SatellitePosition => {
    return {
      timestamp: pos1.timestamp + (pos2.timestamp - pos1.timestamp) * t,
      azimuth: pos1.azimuth + (pos2.azimuth - pos1.azimuth) * t,
      elevation: pos1.elevation + (pos2.elevation - pos1.elevation) * t,
      distance: pos1.distance + (pos2.distance - pos1.distance) * t,
      satLatitude: pos1.satLatitude + (pos2.satLatitude - pos1.satLatitude) * t,
      satLongitude: pos1.satLongitude + (pos2.satLongitude - pos1.satLongitude) * t,
      satAltitude: pos1.satAltitude + (pos2.satAltitude - pos1.satAltitude) * t
    }
  }

  return {
    // State
    currentPosition,
    positionHistory,
    futurePositions,
    isTracking,
    radialVelocity,

    // Methods
    startTracking,
    stopTracking,
    interpolatePosition
  }
}

