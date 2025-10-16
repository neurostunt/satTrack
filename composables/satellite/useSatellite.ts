/**
 * Satellite Composable
 * Provides reactive satellite tracking and calculation functionality
 */

import { ref, computed, readonly, onUnmounted } from 'vue'
import { useSatelliteCalculations } from './useSatelliteCalculations'
import type { Satellite, SatellitePass, ObservationLocation, TLEData } from '~/types/satellite'
import { DEFAULT_SATELLITE_SETTINGS } from '~/constants/satellite'

export const useSatellite = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const lastUpdate = ref<number>(0)
  const isTracking = ref<boolean>(false)
  const trackedSatellites = ref<Satellite[]>([])
  const currentPasses = ref<Map<number, SatellitePass>>(new Map())
  const passSchedule = ref<Map<number, SatellitePass[]>>(new Map())

  // Use calculations composable
  const calculations = useSatelliteCalculations()

  /**
   * Start tracking satellites
   */
  const startTracking = async (
    satellites: Satellite[],
    tleData: TLEData[],
    location: ObservationLocation,
    updateInterval: number = DEFAULT_SATELLITE_SETTINGS.UPDATE_INTERVAL
  ): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      trackedSatellites.value = satellites
      isTracking.value = true
      lastUpdate.value = Date.now()

      console.log(`Started tracking ${satellites.length} satellites`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start tracking'
      console.error('Tracking start error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Stop tracking satellites
   */
  const stopTracking = (): void => {
    isTracking.value = false
    trackedSatellites.value = []
    currentPasses.value.clear()
    passSchedule.value.clear()
    lastUpdate.value = Date.now()
  }

  /**
   * Add satellite to tracking
   */
  const addSatellite = async (satellite: Satellite, tle: TLEData): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      // Update reactive state
      if (!trackedSatellites.value.find(s => s.noradId === satellite.noradId)) {
        trackedSatellites.value.push(satellite)
      }

      lastUpdate.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add satellite'
      console.error('Add satellite error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Remove satellite from tracking
   */
  const removeSatellite = (noradId: number): void => {
    trackedSatellites.value = trackedSatellites.value.filter(s => s.noradId !== noradId)
    currentPasses.value.delete(noradId)
    passSchedule.value.delete(noradId)

    lastUpdate.value = Date.now()
  }

  /**
   * Update TLE data for a satellite
   */
  const updateTLEData = (noradId: number, tle: TLEData): void => {
    lastUpdate.value = Date.now()
  }

  /**
   * Calculate satellite position
   */
  const calculatePosition = (tle: TLEData, time?: Date) => {
    return calculations.calculatePosition(tle, time)
  }

  /**
   * Calculate satellite passes
   */
  const calculatePasses = (
    satellite: Satellite,
    tle: TLEData,
    location: ObservationLocation,
    startTime?: Date,
    endTime?: Date,
    minElevation?: number
  ): Promise<SatellitePass[]> => {
    return calculations.calculatePasses(
      satellite,
      tle,
      location,
      startTime,
      endTime,
      minElevation
    )
  }

  /**
   * Calculate pass schedule for all tracked satellites
   */
  const calculatePassSchedule = async (
    location: ObservationLocation,
    startTime?: Date,
    endTime?: Date,
    minElevation?: number
  ): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const schedule = new Map<number, SatellitePass[]>()

      for (const satellite of trackedSatellites.value) {
        // This would need TLE data - simplified for now
        const passes: SatellitePass[] = []
        schedule.set(satellite.noradId, passes)
      }

      passSchedule.value = schedule
      lastUpdate.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to calculate pass schedule'
      console.error('Pass schedule calculation error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get current pass for a satellite
   */
  const getCurrentPass = (noradId: number): SatellitePass | null => {
    return currentPasses.value.get(noradId) || null
  }

  /**
   * Get next pass for a satellite
   */
  const getNextPass = (
    noradId: number,
    location: ObservationLocation,
    minElevation?: number
  ): SatellitePass | null => {
    const satellite = trackedSatellites.value.find(s => s.noradId === noradId)
    if (!satellite) return null

    // This would need TLE data - simplified for now
    return null
  }

  /**
   * Check if satellite is currently visible
   */
  const isSatelliteVisible = (
    satellite: Satellite,
    tle: TLEData,
    location: ObservationLocation,
    minElevation?: number
  ): boolean => {
    return calculations.isSatelliteVisible(satellite, tle, location, minElevation)
  }

  /**
   * Get satellites currently in pass
   */
  const getSatellitesInPass = (): Satellite[] => {
    const satellitesInPass: Satellite[] = []

    for (const [noradId, pass] of currentPasses.value) {
      const satellite = trackedSatellites.value.find(s => s.noradId === noradId)
      if (satellite) {
        satellitesInPass.push(satellite)
      }
    }

    return satellitesInPass
  }

  /**
   * Get tracking status
   */
  const getTrackingStatus = () => {
    return {
      isActive: isTracking.value,
      trackedCount: trackedSatellites.value.length,
      activePasses: currentPasses.value.size,
      lastUpdate: new Date()
    }
  }

  /**
   * Clear all tracking data
   */
  const clearTracking = (): void => {
    stopTracking()
    lastUpdate.value = Date.now()
  }

  // Computed properties
  const hasError = computed(() => !!error.value)
  const isReady = computed(() => !isLoading.value && !error.value)
  const trackedCount = computed(() => trackedSatellites.value.length)
  const activePassesCount = computed(() => currentPasses.value.size)

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastUpdate: readonly(lastUpdate),
    isTracking: readonly(isTracking),
    trackedSatellites: readonly(trackedSatellites),
    currentPasses: readonly(currentPasses),
    passSchedule: readonly(passSchedule),
    hasError,
    isReady,
    trackedCount,
    activePassesCount,

    // Methods
    startTracking,
    stopTracking,
    addSatellite,
    removeSatellite,
    updateTLEData,
    calculatePosition,
    calculatePasses,
    calculatePassSchedule,
    getCurrentPass,
    getNextPass,
    isSatelliteVisible,
    getSatellitesInPass,
    getTrackingStatus,
    clearTracking
  }
}
