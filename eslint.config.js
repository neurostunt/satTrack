const js = require('@eslint/js')
const tseslint = require('@typescript-eslint/eslint-plugin')
const tsparser = require('@typescript-eslint/parser')
const vue = require('eslint-plugin-vue')
const nuxt = require('eslint-plugin-nuxt')
const vueParser = require('vue-eslint-parser')
const globals = require('globals')

const commonGlobals = {
  ...globals.browser,
  ...globals.node,
  // Nuxt/Nitro helpers
  defineNuxtConfig: 'readonly',
  defineNuxtPlugin: 'readonly',
  defineNitroPlugin: 'readonly',
  defineEventHandler: 'readonly',
  readBody: 'readonly',
  readQuery: 'readonly',
  getQuery: 'readonly',
  getMethod: 'readonly',
  createError: 'readonly',
  useRuntimeConfig: 'readonly',
  useState: 'readonly',
  useFetch: 'readonly',
  useAsyncData: 'readonly',
  useRoute: 'readonly',
  useRouter: 'readonly',
  navigateTo: 'readonly',
  abortNavigation: 'readonly',
  clearError: 'readonly',
  showError: 'readonly',
  useHead: 'readonly',
  useSeoMeta: 'readonly',
  useCookie: 'readonly',
  useRequestHeaders: 'readonly',
  // Vue auto-imports
  ref: 'readonly',
  computed: 'readonly',
  watch: 'readonly',
  watchEffect: 'readonly',
  watchPostEffect: 'readonly',
  watchSyncEffect: 'readonly',
  onMounted: 'readonly',
  onUnmounted: 'readonly',
  onBeforeMount: 'readonly',
  onBeforeUnmount: 'readonly',
  onUpdated: 'readonly',
  onBeforeUpdate: 'readonly',
  onRenderTracked: 'readonly',
  onRenderTriggered: 'readonly',
  reactive: 'readonly',
  toRefs: 'readonly',
  shallowRef: 'readonly',
  triggerRef: 'readonly',
  readonly: 'readonly',
  defineProps: 'readonly',
  defineEmits: 'readonly',
  defineExpose: 'readonly',
  defineSlots: 'readonly',
  useSlots: 'readonly',
  useAttrs: 'readonly',
  h: 'readonly',
  resolveComponent: 'readonly',
  // Common web/platform globals/types
  NodeJS: 'readonly',
  RequestInit: 'readonly',
  Response: 'readonly',
  AbortController: 'readonly',
  DeviceOrientationEvent: 'readonly',
  EventListener: 'readonly',
  HTMLAudioElement: 'readonly',
  Audio: 'readonly',
  IDBDatabase: 'readonly',
  IDBOpenDBRequest: 'readonly',
  IDBKeyRange: 'readonly',
  IDBRequest: 'readonly',
  IDBTransaction: 'readonly',
  IDBCursor: 'readonly',
  Blob: 'readonly',
  URLSearchParams: 'readonly',
  $fetch: 'readonly',
  // Project composables auto-imported by Nuxt (avoid no-undef)
  useRealTimePosition: 'readonly',
  useSatellitePath: 'readonly',
  useSettings: 'readonly',
  usePassStatus: 'readonly',
  useN2YO: 'readonly',
  usePassPrediction: 'readonly',
  usePassData: 'readonly',
  usePassFiltering: 'readonly',
  usePassCleanup: 'readonly',
  useSoundAlerts: 'readonly',
  useDeviceOrientation: 'readonly',
  useTLEData: 'readonly',
  usePolarPlotBackground: 'readonly',
  useCredentials: 'readonly',
  usePWAInstall: 'readonly'
}

const commonTsRules = {
  '@typescript-eslint/no-unused-vars': ['warn', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_'
  }],
  'no-unused-vars': 'off',
  'vue/multi-word-component-names': 'off'
}

module.exports = [
  // Global ignores
  {
    ignores: [
      '.nuxt/**',
      '.output/**',
      'node_modules/**',
      'dist/**',
      '.cache/**'
    ]
  },

  // Base recommended JS rules with shared globals
  {
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsparser,
      globals: commonGlobals
    }
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: commonGlobals
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: commonTsRules
  },

  // Vue files
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsparser,
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: commonGlobals
    },
    plugins: {
      '@typescript-eslint': tseslint,
      vue,
      nuxt
    },
    rules: commonTsRules
  },

  // JavaScript files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: commonGlobals
    },
    rules: {
      'no-unused-vars': ['warn', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }]
    }
  }
]
