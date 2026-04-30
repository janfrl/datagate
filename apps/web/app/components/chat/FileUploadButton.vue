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
    text="Attach file"
  >
    <UButton
      icon="i-lucide-paperclip"
      variant="ghost"
      color="neutral"
      size="sm"
      :disabled="disabled"
      :loading="loading"
      aria-label="Attach file"
      @click="open()"
    />
  </UTooltip>
</template>
