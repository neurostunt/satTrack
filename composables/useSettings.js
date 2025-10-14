import { ref, readonly } from 'vue'
import secureStorage from '~/utils/secureStorage.js'

export const useSettings = () => {
  const settings = ref({
    spaceTrackUsername: '',
    spaceTrackPassword: '',
    satnogsToken: '',
    trackedSatellites: [],
    updateInterval: 5000,
    highAccuracyMode: true,
    autoCalibrateCompass: true,
    gridSquare: '',
    useGridSquare: false,
    disableGPS: false,
    minimumElevation: 5.0,
    units: 'metric',
    compassType: 'magnetic',
    autoUpdateTLE: false,
    soundAlerts: false
  })

  const loadSettings = async () => {
    try {
      const storedSettings = await secureStorage.getSettings()
      if (storedSettings) {
        settings.value = { ...settings.value, ...storedSettings }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveSettings = async () => {
    try {
      await secureStorage.setSettings(settings.value)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  return {
    settings: readonly(settings),
    loadSettings,
    saveSettings
  }
}
