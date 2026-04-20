<script setup lang="ts">
const colorMode = useColorMode()

const themeColor = computed(() => colorMode.value === 'dark' ? '#0f0e0d' : '#faf8f5')
const statusBarStyle = computed(() => colorMode.value === 'dark' ? 'black-translucent' : 'default')

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
    { name: 'theme-color', content: themeColor },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: statusBarStyle }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'manifest', href: '/site.webmanifest' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'WordTrail'
const description = 'Highlight and track your script reading progress in real-time with speech recognition.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image',
  ogImage: '/pwa-512x512.png',
  ogUrl: 'https://wordtrail.web.dev',
  twitterTitle: 'WordTrail',
  twitterDescription: 'Highlight and track your script reading progress in real-time with speech recognition.',
  twitterImage: '/pwa-512x512.png'
})
</script>

<template>
  <UApp>
    <div class="wordtrail-app">
      <NuxtPage />
    </div>
  </UApp>
</template>

<style>
.wordtrail-app {
  min-height: 100dvh;
  background: var(--surface);
  overflow: hidden;
  position: relative;
}
</style>
