/**
 * Doppler Shift Calculations for Satellite Communications
 */

const EARTH_RADIUS_KM = 6371 // Mean Earth radius in kilometers
const SPEED_OF_LIGHT_KMS = 299792.458 // Speed of light in km/s

/**
 * Calculate distance between observer and satellite
 * Uses haversine formula for great circle distance + altitude difference
 *
 * @param observerLat Observer latitude (degrees)
 * @param observerLng Observer longitude (degrees)
 * @param observerAlt Observer altitude (meters)
 * @param satLat Satellite latitude (degrees)
 * @param satLng Satellite longitude (degrees)
 * @param satAlt Satellite altitude (km above Earth surface)
 * @returns Distance in kilometers
 */
export function calculateDistance(
  observerLat: number,
  observerLng: number,
  observerAlt: number,
  satLat: number,
  satLng: number,
  satAlt: number
): number {
  // Convert observer altitude from meters to km
  const obsAltKm = observerAlt / 1000

  // Convert degrees to radians
  const lat1Rad = (observerLat * Math.PI) / 180
  const lat2Rad = (satLat * Math.PI) / 180
  const deltaLatRad = ((satLat - observerLat) * Math.PI) / 180
  const deltaLngRad = ((satLng - observerLng) * Math.PI) / 180

  // Haversine formula for great circle distance on Earth's surface
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // Calculate 3D distance using Pythagorean theorem
  // Observer and satellite are at different altitudes
  const obsRadiusFromCenter = EARTH_RADIUS_KM + obsAltKm
  const satRadiusFromCenter = EARTH_RADIUS_KM + satAlt

  // Law of cosines in 3D
  const distance = Math.sqrt(
    obsRadiusFromCenter * obsRadiusFromCenter +
    satRadiusFromCenter * satRadiusFromCenter -
    2 * obsRadiusFromCenter * satRadiusFromCenter * Math.cos(c)
  )

  return distance
}

/**
 * Calculate radial velocity (rate of change of distance)
 * Positive = satellite moving away, Negative = satellite approaching
 *
 * @param distance1 Previous distance (km)
 * @param distance2 Current distance (km)
 * @param timeDiff Time difference (seconds)
 * @returns Radial velocity in km/s
 */
export function calculateRadialVelocity(
  distance1: number,
  distance2: number,
  timeDiff: number
): number {
  if (timeDiff === 0) return 0
  return (distance2 - distance1) / timeDiff
}

/**
 * Calculate Doppler shift for a given frequency
 *
 * @param frequency Transmitted frequency (Hz)
 * @param radialVelocity Radial velocity (km/s) - positive = moving away, negative = approaching
 * @returns Object with shifted frequency and shift amount
 */
export function calculateDopplerShift(
  frequency: number,
  radialVelocity: number
): { shiftedFrequency: number; shift: number; shiftKHz: number } {
  // Doppler formula: f_received = f_transmitted * (1 - v/c)
  // Negative velocity (approaching) = higher frequency
  // Positive velocity (receding) = lower frequency
  const shiftedFrequency = frequency * (1 - radialVelocity / SPEED_OF_LIGHT_KMS)
  const shift = shiftedFrequency - frequency
  const shiftKHz = shift / 1000 // Convert to kHz for easier reading

  return {
    shiftedFrequency,
    shift, // Hz
    shiftKHz // kHz
  }
}

/**
 * Format Doppler shift for display
 *
 * @param shiftKHz Doppler shift in kHz
 * @returns Formatted string (e.g., "+2.5 kHz" or "-1.2 kHz")
 */
export function formatDopplerShift(shiftKHz: number): string {
  const sign = shiftKHz >= 0 ? '+' : ''
  return `${sign}${shiftKHz.toFixed(1)} kHz`
}

