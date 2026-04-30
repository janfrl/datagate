<script setup lang="ts">
import type { PublicDataset } from '@datagate/shared'

type DiagnosticsTaskCheck = {
  taskName: string
  sourceFile: string
  ok: boolean | null
  status: string
  message?: string
  resultShape?: Record<string, unknown>
  error?: { message: string, statusMessage?: string }
  sourceFilePresent?: boolean
}

type DevtoolsDiagnosticsResponse = {
  ai: {
    configured: boolean
    selectedProvider: string | null
    selectedModel: string | null
    providers?: { google: boolean, gateway: boolean }
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
  expectedNitroTasks: DiagnosticsTaskCheck[]
}

const { csrf, headerName } = useCsrf()

const datasetId = ref<string>('')
const probeDatasetId = ref<string>('')
const probePending = ref(false)
const probeResult = ref<unknown>(null)

const { data, pending, error, refresh } = await useFetch<DevtoolsDiagnosticsResponse>('/api/devtools/diagnostics', {
  query: computed(() => probeDatasetId.value ? { datasetId: probeDatasetId.value } : {}),
  watch: [probeDatasetId]
})

const { data: datasetsData, pending: datasetsPending } = await useFetch<{ datasets: PublicDataset[] }>('/api/devtools/datasets', {
  default: () => ({ datasets: [] })
})

const datasets = computed(() => datasetsData.value?.datasets ?? [])

const activeProbeDatasetId = computed(() => probeDatasetId.value)
const aiKind = computed(() => data.value?.ai.configured ? 'configured' as const : 'missing' as const)
const githubKind = computed(() => data.value?.githubOAuth.configured ? 'configured' as const : 'missing' as const)

function dirKind(exists: boolean) {
  return exists ? 'healthy' as const : 'warning' as const
}

function endpointKind(reachable: boolean) {
  return reachable ? 'configured' as const : 'missing' as const
}

function taskKind(check: DiagnosticsTaskCheck) {
  if (check.ok === true) return 'passed' as const
  if (check.ok === false) return 'failed' as const
  return 'not-tested' as const
}

function taskExplanation(check: DiagnosticsTaskCheck) {
  if (check.ok === true) return 'Task ran successfully against the selected dataset.'
  if (check.ok === false) {
    if (check.sourceFilePresent === false) {
      return 'Expected task source file is missing — register the task in nuxt.config.ts and add the handler file.'
    }
    return check.error?.message || check.message || 'Task did not run in this Nitro server process.'
  }
  return 'Pick a dataset and refresh diagnostics to test this task.'
}

async function refreshWithDataset() {
  if (!datasetId.value) return
  probeDatasetId.value = datasetId.value
}

async function clearProbe() {
  probeDatasetId.value = ''
  await refresh()
}

async function runProbe() {
  if (!datasetId.value) return
  probePending.value = true
  probeResult.value = null

  try {
    probeResult.value = await $fetch('/api/devtools/tasks/probe', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: { datasetId: datasetId.value }
    })
  } catch (err) {
    probeResult.value = {
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }
  } finally {
    probePending.value = false
  }
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
          Verify the environment, then run active probes against a dataset.
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

    <UTabs
      :items="[
        { label: 'Environment', value: 'environment', icon: 'i-lucide-server' },
        { label: 'Active probes', value: 'probes', icon: 'i-lucide-activity' }
      ]"
      class="w-full"
    >
      <template #content="{ item }">
        <!-- Environment tab -->
        <div v-if="item.value === 'environment'" class="mt-4 space-y-4">
          <div class="grid gap-4 lg:grid-cols-2">
            <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
              <h3 class="text-sm font-semibold text-highlighted">
                Provider configuration
              </h3>

              <div class="space-y-2">
                <div class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm">
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">
                      AI provider
                    </p>
                    <p class="text-xs text-muted">
                      {{ data?.ai.selectedProvider || 'Not selected' }}
                      <span v-if="data?.ai.selectedModel" class="ml-1">· {{ data.ai.selectedModel }}</span>
                    </p>
                  </div>
                  <DevtoolsStatusBadge :status="aiKind" />
                </div>

                <div class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm">
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">
                      GitHub OAuth
                    </p>
                    <p class="text-xs text-muted">
                      Used for chat sign-in.
                    </p>
                  </div>
                  <DevtoolsStatusBadge :status="githubKind" />
                </div>
              </div>

              <p
                v-if="!data?.ai.configured"
                class="text-xs text-muted"
              >
                Set <code class="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code> or <code class="font-mono">AI_GATEWAY_API_KEY</code>
                in your <code class="font-mono">.env</code> to enable chat.
              </p>
            </UCard>

            <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
              <h3 class="text-sm font-semibold text-highlighted">
                Local data directories
              </h3>
              <div class="space-y-2">
                <div
                  v-for="directory in data?.localDataDirectories || []"
                  :key="directory.name"
                  class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm"
                >
                  <span class="font-mono text-xs text-highlighted">{{ directory.name }}</span>
                  <DevtoolsStatusBadge
                    :status="dirKind(directory.exists)"
                    :label="directory.exists ? 'Healthy' : 'Missing'"
                  />
                </div>
              </div>
            </UCard>

            <UCard :ui="{ root: 'lg:col-span-2 bg-default/60', body: 'space-y-3' }">
              <h3 class="text-sm font-semibold text-highlighted">
                Required endpoints
              </h3>
              <div class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="endpoint in data?.requiredEndpoints || []"
                  :key="endpoint.route"
                  class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm"
                >
                  <span class="truncate font-mono text-xs text-highlighted">{{ endpoint.route }}</span>
                  <DevtoolsStatusBadge
                    :status="endpointKind(endpoint.reachable)"
                    :label="endpoint.reachable ? 'Configured' : 'Missing'"
                  />
                </div>
              </div>
            </UCard>
          </div>

          <DevtoolsJson
            title="Diagnostics payload"
            :value="data"
            collapsed
          />
        </div>

        <!-- Active probes tab -->
        <div v-else-if="item.value === 'probes'" class="mt-4 space-y-4">
          <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
            <h3 class="text-sm font-semibold text-highlighted">
              Probe runner
            </h3>
            <p class="text-xs text-muted">
              Choose a dataset, then probe the expected Nitro tasks or run a workflow smoke test.
            </p>

            <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <DevtoolsDatasetPicker
                v-model="datasetId"
                :datasets="datasets"
                :loading="datasetsPending"
                placeholder="Pick a dataset for probes"
              />
              <UButton
                icon="i-lucide-activity"
                label="Probe expected tasks"
                color="primary"
                :disabled="!datasetId"
                @click="refreshWithDataset"
              />
              <UButton
                icon="i-lucide-zap"
                label="Run workflow smoke test"
                color="neutral"
                variant="outline"
                :loading="probePending"
                :disabled="!datasetId"
                @click="runProbe"
              />
            </div>

            <div
              v-if="activeProbeDatasetId"
              class="flex items-center justify-between gap-3 rounded-md border border-default bg-elevated/40 px-3 py-2 text-xs text-muted"
            >
              <span>
                Probing dataset
                <code class="ml-1 font-mono text-highlighted">{{ activeProbeDatasetId.slice(0, 8) }}…</code>
              </span>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                label="Clear"
                @click="clearProbe"
              />
            </div>
          </UCard>

          <UCard :ui="{ root: 'bg-default/60', body: 'space-y-2' }">
            <h3 class="text-sm font-semibold text-highlighted">
              Expected Nitro tasks
            </h3>

            <div class="space-y-2">
              <div
                v-for="task in data?.expectedNitroTasks || []"
                :key="task.taskName"
                class="rounded-md border border-default px-3 py-2 text-sm"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="truncate font-mono text-xs text-highlighted">{{ task.taskName }}</span>
                  <DevtoolsStatusBadge :status="taskKind(task)" />
                </div>
                <p class="mt-1 text-xs text-muted">
                  {{ taskExplanation(task) }}
                </p>
                <div
                  v-if="task.ok === false"
                  class="mt-2 rounded-md bg-elevated/60 p-2 text-xs"
                >
                  <span class="font-medium text-highlighted">Next:</span>
                  <span class="ml-1 text-muted">
                    Confirm the task is registered in <code class="font-mono">nuxt.config.ts</code> and that the source file at
                    <code class="font-mono">{{ task.sourceFile }}</code> exists.
                  </span>
                </div>
              </div>
            </div>
          </UCard>

          <UCard
            v-if="probeResult"
            :ui="{ root: 'bg-default/60', body: 'space-y-3' }"
          >
            <h3 class="text-sm font-semibold text-highlighted">
              Workflow smoke test
            </h3>
            <DevtoolsJson
              title="Probe response"
              :value="probeResult"
              collapsed
            />
          </UCard>
        </div>
      </template>
    </UTabs>
  </div>
</template>
