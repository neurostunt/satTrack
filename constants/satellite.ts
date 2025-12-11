/**
 * Satellite Configuration Constants
 * Constants related to satellite tracking and calculations
 */

// Satellite Status
export const SATELLITE_STATUS = {
  ALIVE: 'alive',
  DEAD: 'dead',
  RE_ENTERED: 're-entered',
  UNKNOWN: 'unknown'
}

// Default Satellite Settings
export const DEFAULT_SATELLITE_SETTINGS = {
  UPDATE_INTERVAL: 5000, // 5 seconds
  MIN_ELEVATION: 10, // degrees
  MAX_PASSES: 12,
  PASS_DURATION_THRESHOLD: 300 // 5 minutes in seconds
}

// Satellite Types
export const SATELLITE_TYPES = {
  WEATHER: 'weather',
  COMMUNICATION: 'communication',
  NAVIGATION: 'navigation',
  SCIENTIFIC: 'scientific',
  MILITARY: 'military',
  AMATEUR: 'amateur',
  CUBESAT: 'cubesat',
  DEBRIS: 'debris'
}

// Transmitter Types
export const TRANSMITTER_TYPES = {
  AMATEUR: 'amateur',
  DATA: 'data',
  VOICE: 'voice',
  REPEATER: 'repeater',
  BEACON: 'beacon',
  WEATHER: 'weather',
  COMMUNICATION: 'communication'
}

// Frequency Bands
export const FREQUENCY_BANDS = {
  VHF: { min: 30e6, max: 300e6, name: 'VHF' },
  UHF: { min: 300e6, max: 3000e6, name: 'UHF' },
  L_BAND: { min: 1e9, max: 2e9, name: 'L-Band' },
  S_BAND: { min: 2e9, max: 4e9, name: 'S-Band' },
  C_BAND: { min: 4e9, max: 8e9, name: 'C-Band' },
  X_BAND: { min: 8e9, max: 12e9, name: 'X-Band' }
}

// Example Satellites - Recommended popular satellites for ham radio use
// Recommended for Belgrade, Serbia and general amateur radio satellite tracking
// Only NORAD IDs are stored here - names and details will be fetched from API
export const EXAMPLE_SATELLITES = [
  25544, // ISS
  25338, // NOAA 15
  28654, // NOAA 18
  33591, // NOAA 19
  27607, // SO-50
  43013, // AO-91
  44909, // RS-44 (DOSAAF-85)
  33498, // KUKAI
  40069, // METEOR-M2
  43017, // AO-91 / FOX-1C
  40967, // FOX-1A
  41789, // FOX-1B
  44387, // FOX-1D / AO-92
  // Additional recommended satellites
  98537, // HUNITY
  7530,  // OSCAR 7
  39444, // FUNCUBE-1
  40931, // LAPAN-A2
  43678, // DIWATA-2
  61762, // ArcticSat-1
  58567, // HADES-D
  43137, // FOX-1D
  //98796, // JOVIAN-1
  44354, // PSAT-2
  43700  // QO-100 (Es'hail-2) - Geostationary
]
