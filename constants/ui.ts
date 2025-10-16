/**
 * UI Configuration Constants
 * Constants for UI components, styling, and user experience
 */

// UI Colors (Tailwind CSS classes)
export const UI_COLORS = {
  PRIMARY: {
    DEFAULT: 'primary-600',
    HOVER: 'primary-700',
    LIGHT: 'primary-500',
    DARK: 'primary-800'
  },
  SPACE: {
    DEFAULT: 'space-800',
    LIGHT: 'space-700',
    DARK: 'space-900',
    BORDER: 'space-600',
    TEXT: 'space-300',
    TEXT_LIGHT: 'space-400'
  },
  STATUS: {
    SUCCESS: 'green-400',
    ERROR: 'red-600',
    WARNING: 'yellow-500',
    INFO: 'blue-500'
  }
}

// Component Sizes
export const COMPONENT_SIZES = {
  BUTTON: {
    SMALL: 'px-2 py-1 text-xs',
    MEDIUM: 'px-3 py-2 text-sm',
    LARGE: 'px-4 py-3 text-base'
  },
  INPUT: {
    SMALL: 'px-2 py-1 text-xs',
    MEDIUM: 'px-3 py-2 text-sm',
    LARGE: 'px-4 py-3 text-base'
  },
  CARD: {
    SMALL: 'p-2',
    MEDIUM: 'p-4',
    LARGE: 'p-6'
  }
}

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 'duration-200',
  MEDIUM: 'duration-300',
  SLOW: 'duration-500',
  VERY_SLOW: 'duration-700'
}

// Loading States
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
}

// Form Validation
export const VALIDATION_RULES = {
  REQUIRED: 'required',
  EMAIL: 'email',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  PATTERN: 'pattern'
}

// Grid Square (Maidenhead Locator) Settings
export const GRID_SQUARE = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 8,
  DEFAULT_LENGTH: 6,
  PRECISION: {
    FIELD: 2, // 2 characters for field
    SQUARE: 2, // 2 characters for square
    SUBSQUARE: 2, // 2 characters for subsquare
    EXTENDED: 2 // 2 characters for extended
  }
}

// Notification Settings
export const NOTIFICATION = {
  DURATION: {
    SHORT: 3000, // 3 seconds
    MEDIUM: 5000, // 5 seconds
    LONG: 10000 // 10 seconds
  },
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  }
}
