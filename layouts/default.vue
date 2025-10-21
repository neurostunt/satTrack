<template>
  <div class="min-h-screen space-gradient pb-20 md:pb-4 md:pt-16">
    <!-- Header -->
    <header class="text-center mb-6 px-4 pt-4 md:pt-6">
      <h1 class="text-2xl font-bold mb-1 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
        {{ title }}
      </h1>
      <p class="text-space-300 text-sm">{{ subtitle }}</p>
    </header>

    <!-- Main Content -->
    <main class="max-w-lg mx-auto px-4 pb-4">
      <slot />
    </main>

    <!-- Navigation (Desktop top, Mobile bottom) -->
    <ClientOnly>
      <MobileNav />
    </ClientOnly>
  </div>
</template>

<script setup>
import MobileNav from '~/components/common/MobileNav.vue'

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
