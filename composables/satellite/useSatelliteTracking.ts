/**
 * Satellite Tracking Composable
 * Provides reactive satellite tracking functionality using the satellite module
 */

import { ref, computed, readonly, onUnmounted } from 'vue'
import { useSatellite } from '../satellite/useSatellite'
import type { Satellite, SatellitePass, ObservationLocation, TLEData } from '~/types/satellite'

export const useSatelliteTracking = () => {
  const satellite = useSatellite()

  // Additional reactive state for tracking
  const selectedSatellite = ref<Satellite | null>(null)
  const selectedPass = ref<SatellitePass | null>(null)
  const trackingLocation = ref<ObservationLocation | null>(null)

  /**
   * Start tracking with location
   */
  const startTrackingWithLocation = async (
    satellites: Satellite[],
    tleData: TLEData[],
    location: ObservationLocation,
    updateInterval?: number
  ): Promise<void> => {
    trackingLocation.value = location
    await satellite.startTracking(satellites, tleData, location, updateInterval)
  }

  /**
   * Select satellite for detailed view
   */
  const selectSatellite = (sat: Satellite | null): void => {
    selectedSatellite.value = sat
    if (sat) {
      selectedPass.value = satellite.getCurrentPass(sat.noradId)
    } else {
      selectedPass.value = null
    }
  }

  /**
   * Select pass for detailed view
   */
  const selectPass = (pass: SatellitePass | null): void => {
    selectedPass.value = pass
    if (pass) {
      const sat = satellite.trackedSatellites.value.find((s: Satellite) => s.noradId === pass.noradId)
      selectedSatellite.value = sat || null
    }
  }

  /**
   * Get satellites currently in pass
   */
  const getActiveSatellites = (): Satellite[] => {
    return satellite.getSatellitesInPass()
  }

  /**
   * Get next pass for selected satellite
   */
  const getNextPassForSelected = (): SatellitePass | null => {
    if (!selectedSatellite.value || !trackingLocation.value) return null
    return satellite.getNextPass(selectedSatellite.value.noradId, trackingLocation.value)
  }

  /**
   * Check if selected satellite is currently visible
   */
  const isSelectedSatelliteVisible = (): boolean => {
    if (!selectedSatellite.value || !trackingLocation.value) return false

    const tle = satellite.trackedSatellites.value.find((s: Satellite) => s.noradId === selectedSatellite.value!.noradId)
    if (!tle) return false

    return satellite.isSatelliteVisible(selectedSatellite.value, tle as any, trackingLocation.value)
  }

  // Computed properties
  const hasSelectedSatellite = computed(() => !!selectedSatellite.value)
  const hasSelectedPass = computed(() => !!selectedPass.value)
  const hasTrackingLocation = computed(() => !!trackingLocation.value)
  const activeSatellitesCount = computed(() => getActiveSatellites().length)

  // Cleanup on unmount
  onUnmounted(() => {
    satellite.stopTracking()
  })

  return {
    // Satellite module functionality
    ...satellite,

    // Additional state
    selectedSatellite: readonly(selectedSatellite),
    selectedPass: readonly(selectedPass),
    trackingLocation: readonly(trackingLocation),
    hasSelectedSatellite,
    hasSelectedPass,
    hasTrackingLocation,
    activeSatellitesCount,

    // Additional methods
    startTrackingWithLocation,
    selectSatellite,
    selectPass,
    getActiveSatellites,
    getNextPassForSelected,
    isSelectedSatelliteVisible
  }
}
