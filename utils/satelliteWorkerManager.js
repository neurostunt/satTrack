/**
 * Web Worker Manager for Satellite Calculations
 * Handles communication with satellite calculation Web Worker
 */

class SatelliteWorkerManager {
  constructor() {
    this.worker = null
    this.messageId = 0
    this.pendingMessages = new Map()
    this.isWorkerSupported = typeof Worker !== 'undefined'
    this.workerReady = false
  }

  /**
   * Initialize the Web Worker
   */
  async init() {
    if (!this.isWorkerSupported) {
      console.warn('Web Workers not supported, falling back to main thread')
      return false
    }

    try {
      // Create Web Worker
      this.worker = new Worker('/utils/satelliteWorker.js')
      
      // Handle worker messages
      this.worker.onmessage = (e) => {
        const { id, type, data, error } = e.data
        
        if (this.pendingMessages.has(id)) {
          const { resolve, reject } = this.pendingMessages.get(id)
          this.pendingMessages.delete(id)
          
          if (type === 'ERROR') {
            reject(new Error(error))
          } else {
            resolve(data)
          }
        }
      }
      
      // Handle worker errors
      this.worker.onerror = (error) => {
        console.error('Web Worker error:', error)
        this.workerReady = false
      }
      
      this.workerReady = true
      console.log('Satellite calculation Web Worker initialized')
      return true
      
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error)
      this.workerReady = false
      return false
    }
  }

  /**
   * Send message to worker and return promise
   */
  async sendMessage(type, data) {
    if (!this.workerReady || !this.worker) {
      throw new Error('Web Worker not ready')
    }

    const id = ++this.messageId
    
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject })
      
      this.worker.postMessage({
        id,
        type,
        data
      })
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id)
          reject(new Error('Worker message timeout'))
        }
      }, 10000)
    })
  }

  /**
   * Calculate satellite position using Web Worker
   */
  async calculateSatellitePosition(tleData, observerLocation, time = new Date()) {
    try {
      return await this.sendMessage('CALCULATE_POSITION', {
        tleData,
        observerLocation,
        time
      })
    } catch (error) {
      console.error('Worker calculation failed:', error)
      throw error
    }
  }

  /**
   * Calculate multiple satellites using Web Worker
   */
  async calculateMultipleSatellites(satellites, observerLocation, time = new Date()) {
    try {
      return await this.sendMessage('CALCULATE_MULTIPLE', {
        satellites,
        observerLocation,
        time
      })
    } catch (error) {
      console.error('Worker multiple calculation failed:', error)
      throw error
    }
  }

  /**
   * Get performance metrics from worker
   */
  async getPerformanceMetrics() {
    try {
      return await this.sendMessage('GET_METRICS', {})
    } catch (error) {
      console.error('Failed to get worker metrics:', error)
      return null
    }
  }

  /**
   * Clear worker caches
   */
  async clearCaches() {
    try {
      return await this.sendMessage('CLEAR_CACHES', {})
    } catch (error) {
      console.error('Failed to clear worker caches:', error)
    }
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.workerReady = false
      this.pendingMessages.clear()
      console.log('Satellite calculation Web Worker terminated')
    }
  }

  /**
   * Check if worker is ready
   */
  isReady() {
    return this.workerReady && this.worker !== null
  }
}

// Create singleton instance
const satelliteWorkerManager = new SatelliteWorkerManager()

export default satelliteWorkerManager
