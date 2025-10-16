/**
 * UI Composable
 * Provides common UI functionality and state management
 */

import { ref, computed, readonly } from 'vue'

export const useUI = () => {
  // Reactive state
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)
  const isDarkMode = ref<boolean>(false)
  const sidebarOpen = ref<boolean>(false)
  const mobileMenuOpen = ref<boolean>(false)

  /**
   * Set loading state
   */
  const setLoading = (loading: boolean): void => {
    isLoading.value = loading
  }

  /**
   * Set error message
   */
  const setError = (message: string | null): void => {
    error.value = message
    if (message) {
      success.value = null
    }
  }

  /**
   * Set success message
   */
  const setSuccess = (message: string | null): void => {
    success.value = message
    if (message) {
      error.value = null
    }
  }

  /**
   * Clear all messages
   */
  const clearMessages = (): void => {
    error.value = null
    success.value = null
  }

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = (): void => {
    isDarkMode.value = !isDarkMode.value
    // Store preference in localStorage
    localStorage.setItem('darkMode', isDarkMode.value.toString())
  }

  /**
   * Toggle sidebar
   */
  const toggleSidebar = (): void => {
    sidebarOpen.value = !sidebarOpen.value
  }

  /**
   * Toggle mobile menu
   */
  const toggleMobileMenu = (): void => {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }

  /**
   * Close mobile menu
   */
  const closeMobileMenu = (): void => {
    mobileMenuOpen.value = false
  }

  /**
   * Close sidebar
   */
  const closeSidebar = (): void => {
    sidebarOpen.value = false
  }

  /**
   * Show toast notification
   */
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info'): void => {
    if (type === 'success') {
      setSuccess(message)
    } else if (type === 'error') {
      setError(message)
    } else {
      // For info, we could implement a separate info state
      setSuccess(message)
    }

    // Auto-clear after 3 seconds
    setTimeout(() => {
      clearMessages()
    }, 3000)
  }

  /**
   * Initialize UI state from localStorage
   */
  const initializeUI = (): void => {
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode !== null) {
      isDarkMode.value = savedDarkMode === 'true'
    }

    // Apply dark mode class to document
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyboardShortcuts = (event: KeyboardEvent): void => {
    // Toggle dark mode with Ctrl/Cmd + D
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault()
      toggleDarkMode()
    }

    // Toggle sidebar with Ctrl/Cmd + B
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault()
      toggleSidebar()
    }

    // Close mobile menu with Escape
    if (event.key === 'Escape') {
      closeMobileMenu()
      closeSidebar()
    }
  }

  // Computed properties
  const hasError = computed(() => !!error.value)
  const hasSuccess = computed(() => !!success.value)
  const hasMessage = computed(() => hasError.value || hasSuccess.value)
  const isReady = computed(() => !isLoading.value)

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    success: readonly(success),
    isDarkMode: readonly(isDarkMode),
    sidebarOpen: readonly(sidebarOpen),
    mobileMenuOpen: readonly(mobileMenuOpen),
    hasError,
    hasSuccess,
    hasMessage,
    isReady,

    // Methods
    setLoading,
    setError,
    setSuccess,
    clearMessages,
    toggleDarkMode,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    closeSidebar,
    showToast,
    initializeUI,
    handleKeyboardShortcuts
  }
}
