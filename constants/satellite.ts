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

// Popular Satellites (NORAD IDs)
export const POPULAR_SATELLITES = {
  ISS: 25544,
  NOAA_15: 25338,
  NOAA_18: 28654,
  NOAA_19: 33591,
  METEOR_M2: 40069,
  SO_50: 27607,
  AO_91: 43017,
  FOX_1A: 40967,
  FOX_1B: 41789,
  FOX_1C: 43017,
  FOX_1D: 44387
}
