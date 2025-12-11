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
  decayed?: string
  deployed?: string
  country?: string
  countries?: string
  operator?: string
  purpose?: string
  mass?: number
  apogee?: number
  perigee?: number
  inclination?: number
  period?: number
  description?: string
  website?: string
  image?: string
  // SATCAT (Satellite Catalog) data from CelesTrak
  objectId?: string // International Designator (e.g., "1998-067A")
  objectType?: string // PAY (Payload), R/B (Rocket Body), DEB (Debris), UNK (Unknown)
  opsStatusCode?: string // + (operational), - (non-operational), P (partially operational), B (backup), S (standby), X (extended mission)
  owner?: string // Owner/operator code
  launchSite?: string // Launch site code (e.g., "TYMSC" for Baikonur, "AFETR" for Cape Canaveral)
  rcs?: number // Radar Cross Section (size indicator) in square meters (m²)
  orbitCenter?: string // Orbit center (EA = Earth, etc.)
  orbitType?: string // ORB (orbital), etc.
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
