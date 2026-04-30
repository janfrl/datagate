<script setup lang="ts">
withDefaults(defineProps<{
  open: () => void
  disabled?: boolean
  loading?: boolean
}>(), {
  disabled: false,
  loading: false
})
</script>

<template>
  <UTooltip
    :content="{
      side: 'top'
    }"
    text="Upload CSV dataset"
  >
    <UButton
      icon="i-lucide-paperclip"
      variant="ghost"
      color="neutral"
      size="sm"
      :disabled="disabled"
      :loading="loading"
      aria-label="Upload CSV dataset"
      @click="open()"
    />
  </UTooltip>
</template>
