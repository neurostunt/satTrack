/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Global Types
 * Global TypeScript definitions for the application
 */

import type { Satellite, Transmitter, TLEData, SatellitePass, ObservationLocation } from './satellite'
import type { ApiResponse, ApiCredentials, CacheEntry } from './api'
import type { StorageSettings, TransmitterFilters, StorageStats } from './storage'

// Global application state
export interface AppState {
  isOnline: boolean
  isLoading: boolean
  error: string | null
  lastUpdate: number
}

// Component props interfaces
export interface SatelliteCardProps {
  satellite: Satellite
  isExpanded?: boolean
  showTransmitters?: boolean
  showPasses?: boolean
}

export interface TransmitterListProps {
  transmitters: Transmitter[]
  filters?: TransmitterFilters
  showCallsign?: boolean
}

export interface PassScheduleProps {
  passes: SatellitePass[]
  location: ObservationLocation
  maxPasses?: number
}

// Event interfaces
export interface SatelliteEvent {
  type: 'add' | 'remove' | 'update'
  satellite: Satellite
  timestamp: number
}

export interface PassEvent {
  type: 'start' | 'peak' | 'end'
  pass: SatellitePass
  satellite: Satellite
  timestamp: number
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  timestamp: number
}

// Form interfaces
export interface FormField {
  name: string
  label: string
  type: 'text' | 'password' | 'email' | 'number' | 'select' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface FormState {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
  isSubmitting: boolean
}

// Theme interfaces
export interface ThemeConfig {
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      md: string
      lg: string
      xl: string
    }
  }
}
