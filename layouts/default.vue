<template>
  <div class="min-h-screen space-gradient p-4">
    <!-- Header -->
    <header class="text-center mb-6">
      <h1 class="text-2xl font-bold mb-1 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
        {{ title }}
      </h1>
      <p class="text-space-300 text-sm">{{ subtitle }}</p>
    </header>

    <!-- Main Content -->
    <main class="max-w-lg mx-auto">
      <slot />
    </main>
  </div>
</template>

<script setup>
// Props for customization
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
