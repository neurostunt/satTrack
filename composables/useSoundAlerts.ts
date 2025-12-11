/**
 * Sound Alerts Composable
 * Handles sound notifications for satellite pass events
 */

export interface SoundAlertEvent {
  type: 'pass_start' | 'pass_10min_warning' | 'max_elevation' | 'pass_end'
  noradId: number
  satelliteName?: string
  timestamp: number
}

export const useSoundAlerts = () => {
  const isEnabled = ref(false)
  const playedAlerts = ref(new Set<string>()) // Track which alerts have been played to avoid duplicates

  // Audio context for playing sounds
  let audioContext: AudioContext | null = null
  // Cached audio buffer for sonarping.mp3
  let audioBuffer: AudioBuffer | null = null

  /**
   * Initialize audio context (required for Web Audio API)
   * Web Audio API requires user interaction before playing sounds
   * This will be called lazily when first sound needs to play (after user interaction)
   */
  const initAudioContext = async () => {
    if (typeof window === 'undefined') return
    
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Resume audio context if suspended (required after user interaction)
        // If resume fails, it means user hasn't interacted yet - that's OK, we'll try again later
        if (audioContext.state === 'suspended') {
          try {
            await audioContext.resume()
          } catch (error) {
            // AudioContext can't be resumed without user interaction - this is expected
            // Will be retried on next play attempt
            console.log('AudioContext suspended - will resume on next user interaction')
            return
          }
        }
      } catch (error) {
        // Failed to create AudioContext - might be browser limitation
        console.error('Failed to initialize audio context:', error)
        return
      }
    } else {
      // Resume if already exists but suspended
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume()
        } catch (error) {
          // Can't resume without user interaction - will retry later
          console.log('AudioContext suspended - will resume on next user interaction')
          return
        }
      }
    }
  }

  /**
   * Load sonarping.mp3 audio file into AudioBuffer
   * Caches the buffer for subsequent plays
   */
  const loadAudioBuffer = async (): Promise<AudioBuffer | null> => {
    if (typeof window === 'undefined') return null
    
    // Return cached buffer if already loaded
    if (audioBuffer) {
      return audioBuffer
    }

    await initAudioContext()
    if (!audioContext) return null

    try {
      // Fetch the audio file from public folder
      const response = await fetch('/sonarping.mp3')
      if (!response.ok) {
        throw new Error(`Failed to load audio file: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      return audioBuffer
    } catch (error) {
      console.error('Failed to load sonarping.mp3:', error)
      return null
    }
  }

  /**
   * Play sonarping.mp3 sonar sound
   * Uses the actual audio file for authentic submarine sonar sound
   */
  const playSonarPing = async (
    volume: number = 0.6,
    delay: number = 0
  ) => {
    if (!isEnabled.value) return
    if (typeof window === 'undefined') return

    // Initialize AudioContext (will be created/resumed on first user interaction)
    await initAudioContext()
    if (!audioContext) {
      // AudioContext not available - user hasn't interacted yet
      // Silently fail - sound will work after user interaction
      return
    }
    
    // Ensure audio context is running
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
      } catch (error) {
        // Can't resume without user interaction - silently fail
        return
      }
    }

    // If still suspended after resume attempt, can't play
    if (audioContext.state === 'suspended') {
      return
    }

    const buffer = await loadAudioBuffer()
    if (!buffer) {
      // Failed to load buffer - silently fail
      return
    }

    const playAt = audioContext.currentTime + delay

    try {
      // Create buffer source and gain node
      const source = audioContext.createBufferSource()
      const gainNode = audioContext.createGain()
      
      source.buffer = buffer
      
      // Set volume
      gainNode.gain.value = volume
      
      // Connect and play
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      source.start(playAt)
    } catch (error) {
      // Failed to play - silently fail (might be browser limitation)
      console.debug('Failed to play sonar ping:', error)
    }
  }

  /**
   * Play sonar sound for pass start
   * Two pings - detection sound
   */
  const playPassStart = async () => {
    await initAudioContext()
    // First ping
    await playSonarPing(0.6, 0)
    // Second ping (after delay)
    await playSonarPing(0.5, 0.5)
  }

  /**
   * Play sonar sound for 10-minute warning
   * Single ping - distant detection
   */
  const play10MinWarning = async () => {
    await initAudioContext()
    // Lower volume for distant warning
    await playSonarPing(0.4, 0)
  }

  /**
   * Play sonar sound for max elevation
   * Three pings - peak detection sequence
   */
  const playMaxElevation = async () => {
    await initAudioContext()
    // First ping
    await playSonarPing(0.5, 0)
    // Second ping
    await playSonarPing(0.5, 0.4)
    // Third ping (peak)
    await playSonarPing(0.6, 0.8)
  }

  /**
   * Play sonar sound for pass end
   * Single ping - fading detection
   */
  const playPassEnd = async () => {
    await initAudioContext()
    // Lower volume for fading signal
    await playSonarPing(0.4, 0)
  }

  /**
   * Check and play alert for a pass event
   */
  const checkAndPlayAlert = (event: SoundAlertEvent) => {
    if (!isEnabled.value) return

    const alertKey = `${event.type}-${event.noradId}-${event.timestamp}`
    
    // Avoid playing the same alert multiple times
    if (playedAlerts.value.has(alertKey)) {
      return
    }

    // Mark as played (with 5 second window to avoid duplicates)
    playedAlerts.value.add(alertKey)
    setTimeout(() => {
      playedAlerts.value.delete(alertKey)
    }, 5000)

    switch (event.type) {
      case 'pass_start':
        playPassStart()
        break
      case 'pass_10min_warning':
        play10MinWarning()
        break
      case 'max_elevation':
        playMaxElevation()
        break
      case 'pass_end':
        playPassEnd()
        break
    }
  }

  /**
   * Enable sound alerts
   * Note: AudioContext will be initialized lazily on first sound play (after user interaction)
   */
  const enable = async () => {
    isEnabled.value = true
    // Don't initialize AudioContext here - it requires user interaction
    // It will be initialized automatically when first sound needs to play
  }

  /**
   * Disable sound alerts
   */
  const disable = () => {
    isEnabled.value = false
  }

  /**
   * Clear played alerts cache
   */
  const clearPlayedAlerts = () => {
    playedAlerts.value.clear()
  }

  return {
    isEnabled: computed(() => isEnabled.value),
    enable,
    disable,
    checkAndPlayAlert,
    playPassStart,
    play10MinWarning,
    playMaxElevation,
    playPassEnd,
    clearPlayedAlerts
  }
}
