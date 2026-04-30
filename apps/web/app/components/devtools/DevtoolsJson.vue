<script setup lang="ts">
const props = defineProps<{
  value: unknown
  title?: string
  collapsed?: boolean
}>()

const formatted = computed(() => JSON.stringify(props.value, null, 2))
const open = ref(!props.collapsed)
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-default bg-elevated/50">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      @click="open = !open"
    >
      <span class="text-xs font-medium uppercase tracking-wide text-muted">
        {{ title || 'JSON' }}
      </span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 text-muted transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <pre
      v-if="open"
      class="max-h-[28rem] overflow-auto border-t border-default bg-default/60 p-3 text-xs leading-5 text-highlighted"
    >{{ formatted }}</pre>
  </div>
</template>
