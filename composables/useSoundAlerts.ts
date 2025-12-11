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

  // HTML5 Audio element for playing sounds (better iOS compatibility)
  // Using HTML5 Audio instead of Web Audio API for better iOS Safari support
  // iOS Safari has issues with Web Audio API when mute switch is on
  let audioElement: HTMLAudioElement | null = null

  /**
   * Initialize audio element (HTML5 Audio for better iOS compatibility)
   * HTML5 Audio works better on iOS Safari, especially with mute switch
   */
  const initAudioElement = () => {
    if (typeof window === 'undefined') return null
    
    if (!audioElement) {
      try {
        audioElement = new Audio('/sonarping.mp3')
        audioElement.preload = 'auto' // Preload for faster playback
        audioElement.volume = 0.6 // Default volume
        
        // Handle errors gracefully
        audioElement.addEventListener('error', (e) => {
          console.debug('Audio playback error:', e)
        })
      } catch (error) {
        console.error('Failed to create audio element:', error)
        return null
      }
    }
    
    return audioElement
  }

  /**
   * Play sonarping.mp3 sonar sound using HTML5 Audio
   * HTML5 Audio works better on iOS Safari than Web Audio API
   * Note: On iOS, sounds will respect mute switch unless app is in background
   * For alerts to work on iOS, user should ensure mute switch is off or use Do Not Disturb settings
   */
  const playSonarPing = async (
    volume: number = 0.6,
    delay: number = 0
  ) => {
    if (!isEnabled.value) return
    if (typeof window === 'undefined') return

    const audio = initAudioElement()
    if (!audio) {
      return
    }

    // Set volume
    audio.volume = Math.max(0, Math.min(1, volume)) // Clamp between 0 and 1

    // Handle delay
    if (delay > 0) {
      setTimeout(() => {
        playAudio(audio)
      }, delay * 1000)
    } else {
      playAudio(audio)
    }
  }

  /**
   * Helper function to play audio with error handling
   */
  const playAudio = async (audio: HTMLAudioElement) => {
    try {
      // Reset to start of audio
      audio.currentTime = 0
      
      // Play the audio
      const playPromise = audio.play()
      
      // Handle play promise (required for modern browsers)
      if (playPromise !== undefined) {
        await playPromise.catch((error) => {
          // Play was prevented - might be autoplay policy or mute switch
          // This is expected on iOS when mute switch is on
          console.debug('Audio play prevented:', error.message)
        })
      }
    } catch (error) {
      // Failed to play - might be browser limitation or mute switch
      console.debug('Failed to play sonar ping:', error)
    }
  }

  /**
   * Play sonar sound for pass start
   * Two pings - detection sound
   */
  const playPassStart = async () => {
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
    // Lower volume for distant warning
    await playSonarPing(0.4, 0)
  }

  /**
   * Play sonar sound for max elevation
   * Three pings - peak detection sequence
   */
  const playMaxElevation = async () => {
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
   * Note: HTML5 Audio element will be initialized lazily on first sound play
   * On iOS, sounds will respect mute switch - user should ensure mute switch is off for alerts
   */
  const enable = async () => {
    isEnabled.value = true
    // Audio element will be initialized automatically when first sound needs to play
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
