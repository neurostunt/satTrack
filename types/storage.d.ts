/**
 * Storage Types
 * TypeScript definitions for storage-related interfaces
 */

export interface StorageSettings {
  trackedSatellites: Satellite[]
  spaceTrackUsername: string
  spaceTrackPassword: string
  satnogsToken: string
  updateInterval: number
  observationLocation: ObservationLocation
  transmitterFilters: TransmitterFilters
  gridSquare: string
  useGPS: boolean
  minElevation: number
}

export interface TransmitterFilters {
  amateur: boolean
  data: boolean
  voice: boolean
  repeater: boolean
  beacon: boolean
  weather: boolean
  communication: boolean
}

export interface StorageStats {
  totalSatellites: number
  totalTransmitters: number
  totalTLEEntries: number
  lastUpdated: number
  storageSize: number
}

export interface StorageOperation {
  type: 'read' | 'write' | 'delete' | 'clear'
  key: string
  data?: any
  timestamp: number
  success: boolean
  error?: string
}

export interface IndexedDBConfig {
  name: string
  version: number
  stores: {
    name: string
    keyPath: string
    indexes?: Array<{
      name: string
      keyPath: string
      unique?: boolean
    }>
  }[]
}

export interface CacheConfig {
  maxSize: number
  maxAge: number
  strategy: 'lru' | 'fifo' | 'ttl'
}

export interface StorageError {
  code: string
  message: string
  operation: string
  key?: string
}
