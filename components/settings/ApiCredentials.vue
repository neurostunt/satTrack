<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">API Credentials</h3>
      <div class="space-y-4">
        <!-- Space-Track.org Credentials -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">Space-Track.org (TLE Data)</h4>
          <div class="space-y-2">
            <input
              :value="settings.spaceTrackUsername"
              @input="$emit('update:settings', { ...settings, spaceTrackUsername: $event.target.value })"
              type="text"
              class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
              placeholder="Username"
            />
            <input
              :value="settings.spaceTrackPassword"
              @input="$emit('update:settings', { ...settings, spaceTrackPassword: $event.target.value })"
              type="password"
              class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
              placeholder="Password"
            />
          </div>
        </div>

        <!-- SatNOGS API Token -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">SatNOGS API (Transmitter Data)</h4>
          <input
            :value="settings.satnogsToken"
            @input="$emit('update:settings', { ...settings, satnogsToken: $event.target.value })"
            type="text"
            class="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
            placeholder="API Token"
          />
        </div>

        <!-- Save Credentials Button -->
        <button
          @click="saveSettings"
          class="btn-primary w-full"
          :disabled="isSavingSettings"
        >
          {{ isSavingSettings ? 'Saving...' : 'Save Credentials' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  isSavingSettings: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['save-settings', 'update:settings'])

const saveSettings = () => {
  emit('save-settings')
}
</script>
