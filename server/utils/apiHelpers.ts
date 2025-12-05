/**
 * Shared API Helper Utilities
 * Common patterns for server-side API endpoints
 */

// Auto-imported Nuxt functions
declare const createError: any

/**
 * Create a fetch request with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeout)
    return response
  } catch (error: any) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

/**
 * Build headers with optional authentication token
 */
export function buildHeaders(token?: string | null, additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'SatTrack/1.0',
    ...additionalHeaders
  }

  // Only add Authorization header if token exists and is valid
  if (token && typeof token === 'string' && token.trim().length > 0) {
    headers['Authorization'] = `Token ${token}`
  }

  return headers
}

/**
 * Handle API response errors consistently
 */
export function handleApiError(error: any, apiName: string): never {
  console.error(`${apiName} API error:`, error)

  // If it's already a createError, re-throw it
  if (error.statusCode || error.status) {
    throw error
  }

  // Handle timeout errors
  if (error.message?.includes('timeout')) {
    throw createError({
      statusCode: 504,
      statusMessage: `${apiName} API request timeout`
    })
  }

  // Generic error
  throw createError({
    statusCode: 500,
    statusMessage: `${apiName} API request failed: ${error.message || 'Unknown error'}`
  })
}

/**
 * Validate required parameters
 */
export function validateRequired(params: Record<string, any>, required: string[], apiName: string): void {
  const missing = required.filter(key => !params[key])

  if (missing.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Missing required parameters: ${missing.join(', ')}`
    })
  }
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any, action?: string, message?: string) {
  return {
    success: true,
    message: message || `${action || 'Request'} successful`,
    data,
    action,
    timestamp: new Date().toISOString()
  }
}

