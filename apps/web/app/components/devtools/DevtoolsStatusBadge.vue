<script setup lang="ts">
type DevtoolsStatusKind
  = | 'healthy'
    | 'configured'
    | 'passed'
    | 'warning'
    | 'missing'
    | 'failed'
    | 'disabled'
    | 'not-tested'
    | 'neutral'

const props = defineProps<{
  status: DevtoolsStatusKind
  label?: string
}>()

type StatusBadgeSettings = {
  color: 'success' | 'warning' | 'error' | 'neutral' | 'primary'
  icon: string
  defaultLabel: string
}

const palette: Record<DevtoolsStatusKind, StatusBadgeSettings> = {
  'healthy': { color: 'success', icon: 'i-lucide-check-circle-2', defaultLabel: 'Healthy' },
  'configured': { color: 'success', icon: 'i-lucide-check-circle-2', defaultLabel: 'Configured' },
  'passed': { color: 'success', icon: 'i-lucide-check-circle-2', defaultLabel: 'Passed' },
  'warning': { color: 'warning', icon: 'i-lucide-triangle-alert', defaultLabel: 'Warning' },
  'missing': { color: 'warning', icon: 'i-lucide-circle-dashed', defaultLabel: 'Missing' },
  'failed': { color: 'error', icon: 'i-lucide-x-circle', defaultLabel: 'Failed' },
  'disabled': { color: 'neutral', icon: 'i-lucide-circle-slash', defaultLabel: 'Disabled' },
  'not-tested': { color: 'neutral', icon: 'i-lucide-circle-help', defaultLabel: 'Not tested' },
  'neutral': { color: 'neutral', icon: 'i-lucide-circle', defaultLabel: '' }
}

const settings = computed(() => palette[props.status])
const label = computed(() => props.label ?? settings.value.defaultLabel)
</script>

<template>
  <UBadge
    :color="settings.color"
    variant="soft"
    :icon="settings.icon"
  >
    {{ label }}
  </UBadge>
</template>
