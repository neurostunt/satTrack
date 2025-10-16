<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">API Credentials</h3>
      <div class="space-y-4">
        <!-- Space-Track.org Credentials -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">Space-Track.org (TLE Data)</h4>
          <div class="grid grid-cols-2 gap-2">
            <div class="relative">
              <label class="block text-xs font-medium text-space-300 mb-1">Username</label>
              <input
                v-model="settings.spaceTrackUsername"
                type="text"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
                placeholder="Enter username"
              />
            </div>
            <div class="relative">
              <label class="block text-xs font-medium text-space-300 mb-1">Password</label>
              <input
                v-model="settings.spaceTrackPassword"
                type="password"
                class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
                placeholder="Enter password"
              />
            </div>
          </div>
        </div>

        <!-- SatNOGS API Token -->
        <div>
          <h4 class="text-sm font-medium text-space-200 mb-2">SatNOGS API (Transmitter Data)</h4>
          <div class="relative">
            <label class="block text-xs font-medium text-space-300 mb-1">API Token</label>
            <input
              v-model="settings.satnogsToken"
              type="text"
              class="w-full bg-space-800 border border-space-700 rounded px-2 py-1 text-xs text-white focus:border-primary-500 focus:outline-none box-border"
              placeholder="Enter your SatNOGS API token"
            />
          </div>
        </div>

        <!-- Save Credentials Button -->
        <button
          @click="saveSettings"
          class="btn-primary w-full text-sm"
          :disabled="isSavingSettings"
        >
          {{ isSavingSettings ? 'Saving...' : 'Save Credentials' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props
defineProps({
  settings: {
    type: Object,
    required: true
  },
  isSavingSettings: {
    type: Boolean,
    default: false
  }
})

// Emits
defineEmits(['save-settings'])
</script>

<style scoped>
/* Fix for password manager extensions like Dashlane */
.relative {
  position: relative;
  overflow: hidden;
}

.relative input {
  box-sizing: border-box;
  width: 100%;
}

/* Ensure proper spacing in grid */
.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-2 {
  gap: 0.5rem;
}
</style>
