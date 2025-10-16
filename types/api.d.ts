/**
 * API Types
 * TypeScript definitions for API-related interfaces
 */

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  action?: string
}

export interface SpaceTrackCredentials {
  username: string
  password: string
}

export interface SatnogsCredentials {
  token: string
}

export interface ApiCredentials {
  spaceTrack: SpaceTrackCredentials
  satnogs: SatnogsCredentials
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
}

export interface SearchParams {
  query: string
  limit?: number
  offset?: number
  filters?: Record<string, any>
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface ApiError {
  status: number
  statusText: string
  message: string
  details?: any
}
