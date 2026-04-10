/**
 * Real-Time Position Composable
 * Handles fetching and interpolating satellite positions during a pass
 *
 * N2YO mode: Fetch 300s of positions at once, interpolate for smooth animation
 * TLE mode: SGP4 in-browser via satellite.js — high refresh, no N2YO quota
 */

import type { SatRec } from 'satellite.js'
import { calculateDistance, calculateRadialVelocity } from '~/utils/dopplerCalculations'
import { lerpAzimuthDeg } from '~/utils/angleMath'
import { computeLookAnglesFromTle, createSatRecFromTle } from '~/utils/satelliteLookAngles'
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

  /** 'n2yo' | 'tle' — which pipeline feeds `currentPosition` */
  const trackingSource = ref<'n2yo' | 'tle' | null>(null)
  const tleSatrec = shallowRef<SatRec | null>(null)
  let lastTleHistoryMs = 0
  let lastTleFutureRefreshMs = 0

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
    apiKey: string,
    options?: { tle?: { line1: string; line2: string } | null }
  ) => {
    // Prevent duplicate tracking
    if (isTracking.value) {
      console.warn(`⚠️ Already tracking NORAD ${noradId} - ignoring duplicate start request`)
      return
    }

    const tle = options?.tle
    const useTle = !!(tle?.line1 && tle?.line2)

    if (!useTle && !apiKey) {
      console.error('❌ Cannot start tracking: N2YO API key is missing and no TLE provided')
      return
    }

    isTracking.value = true
    positionHistory.value = []
    futurePositions.value = []
    radialVelocity.value = 0
    serverTimestamp.value = 0
    serverTimestampOffset.value = 0

    observerLocation.value = {
      lat: observerLat,
      lng: observerLng,
      alt: observerAlt
    }

    if (useTle) {
      trackingSource.value = 'tle'
      tleSatrec.value = createSatRecFromTle(tle!.line1, tle!.line2)
      lastTleHistoryMs = 0
      lastTleFutureRefreshMs = 0
      refillTleFutureBuffer(observerLat, observerLng, observerAlt)
      console.log(`🛰️ AR tracking: TLE / SGP4 mode (NORAD ${noradId})`)
    } else {
      trackingSource.value = 'n2yo'
      tleSatrec.value = null
      await fetchPositions(noradId, observerLat, observerLng, observerAlt, apiKey)
    }

    startAnimation(noradId, observerLat, observerLng, observerAlt, apiKey)
  }

  /**
   * Pre-compute a short future arc for polar plot (same role as N2YO buffer).
   */
  const refillTleFutureBuffer = (
    observerLat: number,
    observerLng: number,
    observerAlt: number
  ) => {
    const satrec = tleSatrec.value
    if (!satrec) return

    const start = Date.now()
    const samples: SatellitePosition[] = []
    for (let i = 0; i < 90; i++) {
      const t = new Date(start + i * 2000)
      const p = computeLookAnglesFromTle(satrec, observerLat, observerLng, observerAlt, t)
      if (p) {
        samples.push({
          timestamp: p.timestamp,
          azimuth: p.azimuth,
          elevation: p.elevation,
          distance: p.distance,
          satLatitude: p.satLatitude,
          satLongitude: p.satLongitude,
          satAltitude: p.satAltitude
        })
      }
    }
    futurePositions.value = samples
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
    trackingSource.value = null
    tleSatrec.value = null

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

      const clientNow = Date.now()

      // ——— TLE / SGP4: compute position every frame from local elements ———
      if (trackingSource.value === 'tle' && tleSatrec.value) {
        const satrec = tleSatrec.value
        const now = new Date()
        const pos = computeLookAnglesFromTle(satrec, observerLat, observerLng, observerAlt, now)
        if (pos) {
          const sp: SatellitePosition = {
            timestamp: pos.timestamp,
            azimuth: pos.azimuth,
            elevation: pos.elevation,
            distance: pos.distance,
            satLatitude: pos.satLatitude,
            satLongitude: pos.satLongitude,
            satAltitude: pos.satAltitude
          }
          if (observerLocation.value) {
            sp.distance = calculateDistance(
              observerLocation.value.lat,
              observerLocation.value.lng,
              observerLocation.value.alt,
              sp.satLatitude,
              sp.satLongitude,
              sp.satAltitude
            )
          }
          if (currentPosition.value && currentPosition.value.distance > 0 && sp.distance > 0) {
            const dtSec = (sp.timestamp - currentPosition.value.timestamp) / 1000
            if (dtSec > 0) {
              radialVelocity.value = calculateRadialVelocity(
                currentPosition.value.distance,
                sp.distance,
                dtSec
              )
            }
          }
          currentPosition.value = sp
          if (clientNow - lastTleHistoryMs >= 900) {
            lastTleHistoryMs = clientNow
            positionHistory.value.push({ ...sp })
            const fiveMinutesAgo = clientNow - 5 * 60 * 1000
            positionHistory.value = positionHistory.value.filter(p => p.timestamp > fiveMinutesAgo)
          }
          if (clientNow - lastTleFutureRefreshMs >= 2500) {
            lastTleFutureRefreshMs = clientNow
            refillTleFutureBuffer(observerLat, observerLng, observerAlt)
          }
        }
        animationFrameId = requestAnimationFrame(animate)
        return
      }

      // Use server-side timestamp for position calculations to ensure consistency across devices
      // Calculate current server time based on offset from last fetch
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
      azimuth: lerpAzimuthDeg(pos1.azimuth, pos2.azimuth, t),
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
    trackingSource,

    // Methods
    startTracking,
    stopTracking,
    interpolatePosition
  }
}

