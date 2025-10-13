export const useToast = () => {
  const toasts = ref([])
  let toastId = 0

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = ++toastId
    const toast = {
      id,
      message,
      type,
      duration,
      visible: true
    }

    toasts.value.push(toast)

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value[index].visible = false
      // Remove from array after animation
      setTimeout(() => {
        toasts.value.splice(index, 1)
      }, 300)
    }
  }

  const success = (message, duration = 4000) => {
    return addToast(message, 'success', duration)
  }

  const error = (message, duration = 6000) => {
    return addToast(message, 'error', duration)
  }

  const warning = (message, duration = 5000) => {
    return addToast(message, 'warning', duration)
  }

  const info = (message, duration = 4000) => {
    return addToast(message, 'info', duration)
  }

  const clearAll = () => {
    toasts.value.forEach(toast => {
      toast.visible = false
    })
    setTimeout(() => {
      toasts.value = []
    }, 300)
  }

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll
  }
}
