/**
 * Transmitter Filtering Utility
 * Filters transmitters based on VHF (136-174 MHz) and UHF (400-520 MHz) bands
 */

import type { Transmitter } from '~/types/satellite'

/**
 * Checks if a frequency is in the VHF band (136-174 MHz)
 * Includes 2m amateur band (144-148 MHz) and weather satellites (137 MHz)
 */
function isVHFBand(frequency: number): boolean {
  return frequency >= 136000000 && frequency <= 174000000
}

/**
 * Checks if a frequency is in the UHF band (400-520 MHz)
 * Includes 70cm amateur band (430-440 MHz)
 */
function isUHFBand(frequency: number): boolean {
  return frequency >= 400000000 && frequency <= 520000000
}

/**
 * Checks if a transmitter has frequencies in VHF (136-174 MHz) or UHF (400-520 MHz) bands
 */
function hasAmateurBandFrequency(transmitter: Transmitter): boolean {
  // Check downlink frequencies (handle both camelCase and snake_case from API)
  const downlinkLow = (transmitter as any).downlink_low || transmitter.downlinkLow || transmitter.downlinkFrequency || transmitter.frequency
  const downlinkHigh = (transmitter as any).downlink_high || transmitter.downlinkHigh
  
  // Check uplink frequencies (handle both camelCase and snake_case from API)
  const uplinkLow = (transmitter as any).uplink_low || transmitter.uplinkLow || transmitter.uplinkFrequency
  const uplinkHigh = (transmitter as any).uplink_high || transmitter.uplinkHigh

  // Check if any frequency is in VHF or UHF bands
  if (downlinkLow) {
    if (isVHFBand(downlinkLow) || isUHFBand(downlinkLow)) {
      return true
    }
  }
  
  if (downlinkHigh) {
    if (isVHFBand(downlinkHigh) || isUHFBand(downlinkHigh)) {
      return true
    }
  }
  
  if (uplinkLow) {
    if (isVHFBand(uplinkLow) || isUHFBand(uplinkLow)) {
      return true
    }
  }
  
  if (uplinkHigh) {
    if (isVHFBand(uplinkHigh) || isUHFBand(uplinkHigh)) {
      return true
    }
  }

  return false
}

/**
 * Checks if a transmitter matches the filter settings
 */
export function matchesTransmitterFilters(
  transmitter: Transmitter,
  filters: { showOnly2m70cm: boolean }
): boolean {
  // If filter is disabled, show all transmitters
  if (!filters.showOnly2m70cm) {
    return true
  }

  // If filter is enabled, only show transmitters with VHF (136-174 MHz) or UHF (400-520 MHz) frequencies
  return hasAmateurBandFrequency(transmitter)
}
