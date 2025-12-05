/**
 * Satellite Types
 * TypeScript definitions for satellite-related interfaces
 */

export interface Satellite {
  noradId: number
  name: string
  names?: string
  status: 'alive' | 'dead' | 're-entered' | 'unknown'
  type?: string
  launchDate?: string
  decayDate?: string
  country?: string
  operator?: string
  purpose?: string
  mass?: number
  apogee?: number
  perigee?: number
  inclination?: number
  period?: number
}

export interface TLEData {
  noradId: number
  line1: string
  line2: string
  timestamp: number
  source: 'space-track' | 'satnogs' | 'celestrak' | 'manual'
}

export interface SatellitePosition {
  noradId: number
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  timestamp: number
}

export interface SatellitePass {
  noradId: number
  startTime: Date
  endTime: Date
  peakTime: Date
  maxElevation: number
  duration: number
  azimuth: number
  elevation: number
}

export interface Transmitter {
  id: number
  noradId: number
  description: string
  mode: string
  downlinkLow?: number
  downlinkHigh?: number
  uplinkLow?: number
  uplinkHigh?: number
  frequency?: number
  downlinkFrequency?: number
  uplinkFrequency?: number
  ctcss?: number
  callsign?: string
  status: 'active' | 'inactive' | 'operational'
  type?: string
  invert?: boolean
  baud?: number
  modulation?: string
}

export interface SatelliteTrackingData {
  satellite: Satellite
  tle?: TLEData
  transmitters: Transmitter[]
  position?: SatellitePosition
  passes?: SatellitePass[]
  timestamp: number
}

export interface ObservationLocation {
  latitude: number
  longitude: number
  altitude: number
  gridSquare?: string
  name?: string
}

export interface TrackingSettings {
  updateInterval: number
  minElevation: number
  maxPasses: number
  autoTrack: boolean
  notifications: boolean
}
