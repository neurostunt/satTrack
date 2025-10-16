/**
 * API Configuration Constants
 * Centralized configuration for all API endpoints and settings
 */

// API Endpoints
export const API_ENDPOINTS = {
  SPACE_TRACK: {
    BASE_URL: 'https://www.space-track.org',
    LOGIN: '/ajaxauth/login',
    TLE: '/basicspacedata/query/class/tle_latest',
    SATELITE_DATA: '/basicspacedata/query/class/satcat'
  },
  SATNOGS: {
    BASE_URL: 'https://db.satnogs.org/api',
    SATELLITES: '/satellites',
    TLE: '/tle',
    TRANSMITTERS: '/transmitters',
    TELEMETRY: '/telemetry'
  }
} as const

// Cache Durations (in milliseconds)
export const CACHE_DURATION = {
  SEARCH_RESULTS: 24 * 60 * 60 * 1000, // 1 day
  TLE_DATA: 2 * 60 * 60 * 1000, // 2 hours
  TRANSMITTER_DATA: 6 * 60 * 60 * 1000, // 6 hours
  SATELLITE_DATA: 12 * 60 * 60 * 1000 // 12 hours
} as const

// API Limits
export const API_LIMITS = {
  SEARCH_RESULTS: 20,
  TLE_BATCH_SIZE: 50,
  TRANSMITTER_BATCH_SIZE: 100
} as const

// Request Timeouts (in milliseconds)
export const REQUEST_TIMEOUT = {
  DEFAULT: 10000, // 10 seconds
  LONG_RUNNING: 30000, // 30 seconds
  QUICK: 5000 // 5 seconds
} as const

// User Agent
export const USER_AGENT = 'SatTrack/1.0' as const
