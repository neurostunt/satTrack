<template>
  <div class="max-w-lg mx-auto mb-6">
    <div class="card p-4">
      <h3 class="text-lg font-semibold mb-4 text-primary-400">Storage Management</h3>

      <div class="space-y-4">
        <!-- Storage Usage -->
        <div v-if="!isLoadingStorage && storageInfo.indexedDB" class="p-3 bg-space-800 border border-space-700 rounded text-xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-space-300">IndexedDB Storage</span>
            <span class="text-primary-400">{{ storageInfo.indexedDB.total || '0 B' }}</span>
          </div>
          <div class="space-y-1 text-space-400">
            <div class="flex justify-between">
              <span>TLE Data:</span>
              <span>{{ storageInfo.indexedDB.tle || '0 B' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Settings:</span>
              <span>{{ storageInfo.indexedDB.settings || '0 B' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Credentials:</span>
              <span>{{ storageInfo.indexedDB.credentials || '0 B' }}</span>
            </div>
          </div>
        </div>

        <!-- Storage Actions -->
        <div class="flex gap-2 flex-wrap">
          <button
            @click="loadStorageInfo"
            class="btn-secondary text-xs px-3 py-1"
            :disabled="isLoadingStorage"
          >
            {{ isLoadingStorage ? 'Loading...' : 'Refresh Storage Info' }}
          </button>
          <button
            @click="testStorage"
            class="text-blue-300 hover:text-blue-200 text-xs px-3 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
          >
            Test Storage
          </button>
          <button
            @click="clearAllData"
            class="text-red-300 hover:text-red-200 text-xs px-3 py-1 bg-space-700 hover:bg-space-600 rounded transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  storageInfo: {
    type: Object,
    required: true
  },
  isLoadingStorage: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['load-storage-info', 'test-storage', 'clear-all-data'])

const loadStorageInfo = () => {
  emit('load-storage-info')
}

const testStorage = () => {
  emit('test-storage')
}

const clearAllData = () => {
  emit('clear-all-data')
}
</script>
