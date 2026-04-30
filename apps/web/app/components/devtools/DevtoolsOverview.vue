<script setup lang="ts">
type DevtoolsOverview = {
  tools: number
  workflows: number
  expectedNitroTasks: number
  environment: string
}

defineProps<{
  overview?: DevtoolsOverview | null
}>()
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="metric in [{
          label: 'High-level tools',
          value: overview?.tools ?? 0,
          icon: 'i-lucide-wrench'
        }, {
          label: 'Workflows',
          value: overview?.workflows ?? 0,
          icon: 'i-lucide-git-branch'
        }, {
          label: 'Expected tasks',
          value: overview?.expectedNitroTasks ?? 0,
          icon: 'i-lucide-list-checks'
        }, {
          label: 'Environment',
          value: overview?.environment ?? 'unknown',
          icon: 'i-lucide-terminal'
        }]"
        :key="metric.label"
        class="rounded-lg border border-default bg-default/60 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-muted">
            {{ metric.label }}
          </p>
          <UIcon
            :name="metric.icon"
            class="size-4 text-muted"
          />
        </div>
        <p class="mt-3 truncate text-3xl font-semibold tracking-tight text-highlighted">
          {{ metric.value }}
        </p>
      </div>
    </div>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-lock"
      title="Privacy guardrails"
      description="DevTools endpoints return metadata, schemas, summaries, result shapes, and sanitized report content. They do not return raw dataset rows, API keys, OAuth secrets, or storage paths by default."
    />

    <DevtoolsJson
      title="Overview payload"
      :value="overview"
      collapsed
    />
  </div>
</template>
