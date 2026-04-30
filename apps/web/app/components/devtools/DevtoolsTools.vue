<script setup lang="ts">
type DevtoolsToolsResponse = {
  highLevelTools: Array<{
    id: string
    title: string
    description: string
    inputSchema: Record<string, unknown>
  }>
  expectedNitroTasks: Array<{
    name: string
    description: string
    inputSchema: Record<string, unknown>
    availability: {
      status: string
      message: string
    }
  }>
}

const { data, pending, error, refresh } = await useFetch<DevtoolsToolsResponse>('/api/devtools/tools')
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Tool Registry
        </h2>
        <p class="text-sm text-muted">
          High-level chat tools and workflow task contracts.
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        label="Refresh"
        color="neutral"
        variant="ghost"
        :loading="pending"
        @click="() => refresh()"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="error.message"
    />

    <div v-else class="grid gap-6 2xl:grid-cols-2">
      <section class="rounded-lg border border-default bg-default/60">
        <div class="border-b border-default px-4 py-3">
          <h3 class="text-sm font-semibold text-highlighted">
            High-level AI tools
          </h3>
        </div>
        <div
          v-for="tool in data?.highLevelTools || []"
          :key="tool.id"
          class="border-b border-default p-4 last:border-b-0"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-highlighted">
                {{ tool.title }}
              </p>
              <p class="mt-1 text-sm text-muted">
                {{ tool.description }}
              </p>
            </div>
            <UBadge color="neutral" variant="soft">
              {{ tool.id }}
            </UBadge>
          </div>
          <DevtoolsJson
            class="mt-3"
            title="Input schema"
            :value="tool.inputSchema"
            collapsed
          />
        </div>
      </section>

      <section class="rounded-lg border border-default bg-default/60">
        <div class="border-b border-default px-4 py-3">
          <h3 class="text-sm font-semibold text-highlighted">
            Expected Nitro tasks
          </h3>
        </div>
        <div
          v-for="task in data?.expectedNitroTasks || []"
          :key="task.name"
          class="border-b border-default p-4 last:border-b-0"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-highlighted">
                {{ task.name }}
              </p>
              <p class="mt-1 text-sm text-muted">
                {{ task.description }}
              </p>
            </div>
            <UBadge color="warning" variant="soft">
              {{ task.availability.status }}
            </UBadge>
          </div>
          <DevtoolsJson
            class="mt-3"
            title="Input schema"
            :value="task.inputSchema"
            collapsed
          />
        </div>
      </section>
    </div>
  </div>
</template>
