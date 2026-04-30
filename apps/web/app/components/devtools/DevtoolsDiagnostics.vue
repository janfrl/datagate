<script setup lang="ts">
const { csrf, headerName } = useCsrf()

const datasetId = ref('')
const diagnosticsDatasetId = ref('')
const probePending = ref(false)
const probeResult = ref<unknown>()

type DevtoolsDiagnosticsResponse = {
  ai: {
    configured: boolean
    selectedProvider: string | null
    selectedModel: string | null
  }
  githubOAuth: {
    configured: boolean
  }
  localDataDirectories: Array<{
    name: string
    exists: boolean
  }>
  requiredEndpoints: Array<{
    route: string
    reachable: boolean
  }>
  expectedNitroTasks: Array<{
    taskName: string
    ok: boolean | null
    status: string
  }>
}

const {
  data,
  pending,
  error,
  refresh
} = await useFetch<DevtoolsDiagnosticsResponse>('/api/devtools/diagnostics', {
  query: computed(() => diagnosticsDatasetId.value ? { datasetId: diagnosticsDatasetId.value } : {}),
  watch: [diagnosticsDatasetId]
})

async function runDiagnosticsProbe() {
  diagnosticsDatasetId.value = datasetId.value.trim()
  await refresh()
}

async function runTaskProbe() {
  probePending.value = true
  probeResult.value = undefined

  try {
    probeResult.value = await $fetch('/api/devtools/tasks/probe', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: {
        datasetId: datasetId.value
      }
    })
  } catch (error) {
    probeResult.value = {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    probePending.value = false
  }
}

function statusColor(value: boolean | null | undefined) {
  if (value === true) return 'success'
  if (value === false) return 'error'
  return 'warning'
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Diagnostics
        </h2>
        <p class="text-sm text-muted">
          Checks configuration, local directories, endpoint files, and expected Nitro task runtime availability.
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

    <div class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="datasetId"
        icon="i-lucide-database"
        placeholder="Dataset id for task probes"
        class="flex-1"
      />
      <UButton
        icon="i-lucide-activity"
        label="Refresh diagnostics with dataset"
        color="neutral"
        variant="outline"
        :disabled="!datasetId"
        @click="runDiagnosticsProbe"
      />
      <UButton
        icon="i-lucide-play"
        label="Run task probe"
        color="neutral"
        :loading="probePending"
        :disabled="!datasetId"
        @click="runTaskProbe"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Provider configuration
        </h3>
        <div class="flex flex-wrap gap-2">
          <UBadge
            :color="statusColor(data?.ai.configured)"
            variant="soft"
          >
            AI {{ data?.ai.configured ? 'configured' : 'missing' }}
          </UBadge>
          <UBadge color="neutral" variant="soft">
            Provider {{ data?.ai.selectedProvider || 'none' }}
          </UBadge>
          <UBadge color="neutral" variant="soft">
            Model {{ data?.ai.selectedModel || 'none' }}
          </UBadge>
          <UBadge
            :color="statusColor(data?.githubOAuth.configured)"
            variant="soft"
          >
            GitHub OAuth {{ data?.githubOAuth.configured ? 'configured' : 'missing' }}
          </UBadge>
        </div>
        <DevtoolsJson
          title="Provider JSON"
          :value="data?.ai"
          collapsed
        />
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Expected Nitro tasks
        </h3>
        <div class="space-y-2">
          <div
            v-for="task in data?.expectedNitroTasks || []"
            :key="task.taskName"
            class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2"
          >
            <span class="truncate font-mono text-xs text-highlighted">{{ task.taskName }}</span>
            <UBadge
              :color="statusColor(task.ok)"
              variant="soft"
            >
              {{ task.status }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Local data directories
        </h3>
        <div class="space-y-2">
          <div
            v-for="directory in data?.localDataDirectories || []"
            :key="directory.name"
            class="flex items-center justify-between rounded-md border border-default px-3 py-2 text-sm"
          >
            <span>{{ directory.name }}</span>
            <UBadge
              :color="statusColor(directory.exists)"
              variant="soft"
            >
              {{ directory.exists ? 'exists' : 'missing' }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Required endpoints
        </h3>
        <div class="space-y-2">
          <div
            v-for="endpoint in data?.requiredEndpoints || []"
            :key="endpoint.route"
            class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm"
          >
            <span class="truncate">{{ endpoint.route }}</span>
            <UBadge
              :color="statusColor(endpoint.reachable)"
              variant="soft"
            >
              {{ endpoint.reachable ? 'present' : 'missing' }}
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>

    <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
      <h3 class="text-sm font-semibold text-highlighted">
        Diagnostics JSON
      </h3>
      <DevtoolsJson
        title="Diagnostics payload"
        :value="data"
        collapsed
      />
    </UCard>

    <UCard
      v-if="probeResult"
      :ui="{ root: 'bg-default/60', body: 'space-y-3' }"
    >
      <h3 class="text-sm font-semibold text-highlighted">
        Task probe JSON
      </h3>
      <DevtoolsJson
        title="Task probe payload"
        :value="probeResult"
      />
    </UCard>
  </div>
</template>
