<script setup lang="ts">
// Redirect to scripts list page

const router = useRouter()

onMounted(() => {
  router.replace('/scripts')
})
</script>

<template>
  <div class="redirect-page">
    <div class="loading-spinner" />
  </div>
</template>

<style scoped>
.redirect-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  background: var(--surface);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
