<script setup lang="ts">
import type { PublicDataset } from '@datagate/shared'

type ToolDefinition = {
  id: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
}

type TaskDefinition = {
  name: string
  description: string
  sourceFile: string
  inputSchema: Record<string, unknown>
}

type DevtoolsToolsResponse = {
  highLevelTools: ToolDefinition[]
  expectedNitroTasks: TaskDefinition[]
}

type ProbeOutcome = {
  ok: boolean
  durationMs?: number
  resultShape?: Record<string, unknown>
  error?: { message: string, statusMessage?: string, statusCode?: number }
}

type ProbeResponse = {
  datasetId: string
  results: Array<{
    taskName: string
    sourceFile: string
    ok: boolean
    durationMs?: number
    resultShape?: Record<string, unknown>
    error?: { message: string, statusMessage?: string, statusCode?: number }
  }>
}

const { csrf, headerName } = useCsrf()

const { data, pending, error, refresh } = await useFetch<DevtoolsToolsResponse>('/api/devtools/tools')
const { data: datasetsData, pending: datasetsPending } = await useFetch<{ datasets: PublicDataset[] }>('/api/devtools/datasets', {
  default: () => ({ datasets: [] })
})

const datasets = computed(() => datasetsData.value?.datasets ?? [])
const datasetId = ref<string>('')
const probingTaskName = ref<string>('')
const probingAll = ref(false)
const probeResults = ref<Record<string, ProbeOutcome>>({})

function setLatestDataset() {
  if (!datasetId.value && datasets.value.length > 0) {
    datasetId.value = datasets.value[0]!.id
  }
}

watch(datasets, setLatestDataset, { immediate: true })

async function probeTask(taskName: string) {
  if (!datasetId.value) return
  probingTaskName.value = taskName

  try {
    const response = await $fetch<ProbeResponse>('/api/devtools/tasks/probe', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: { datasetId: datasetId.value, taskName }
    })

    const result = response.results[0]
    if (result) {
      probeResults.value = {
        ...probeResults.value,
        [taskName]: {
          ok: result.ok,
          durationMs: result.durationMs,
          resultShape: result.resultShape,
          error: result.error
        }
      }
    }
  } catch (err) {
    probeResults.value = {
      ...probeResults.value,
      [taskName]: {
        ok: false,
        error: { message: err instanceof Error ? err.message : String(err) }
      }
    }
  } finally {
    probingTaskName.value = ''
  }
}

async function probeAllTasks() {
  if (!datasetId.value) return
  probingAll.value = true

  try {
    const response = await $fetch<ProbeResponse>('/api/devtools/tasks/probe', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: { datasetId: datasetId.value }
    })

    const next: Record<string, ProbeOutcome> = {}
    for (const result of response.results) {
      next[result.taskName] = {
        ok: result.ok,
        durationMs: result.durationMs,
        resultShape: result.resultShape,
        error: result.error
      }
    }
    probeResults.value = next
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const next: Record<string, ProbeOutcome> = {}
    for (const task of data.value?.expectedNitroTasks ?? []) {
      next[task.name] = { ok: false, error: { message } }
    }
    probeResults.value = next
  } finally {
    probingAll.value = false
  }
}

function statusFor(taskName: string) {
  const result = probeResults.value[taskName]
  if (!result) return 'not-tested' as const
  return result.ok ? 'passed' as const : 'failed' as const
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Tools
        </h2>
        <p class="text-sm text-muted">
          Model-facing AI tools and the Nitro tasks workflows depend on.
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
        { label: 'AI tools', value: 'tools', icon: 'i-lucide-wrench' },
        { label: 'Nitro tasks', value: 'tasks', icon: 'i-lucide-list-checks' }
      ]"
      class="w-full"
    >
      <template #content="{ item }">
        <!-- AI tools tab -->
        <div v-if="item.value === 'tools'" class="mt-4 space-y-3">
          <div
            v-for="tool in data?.highLevelTools || []"
            :key="tool.id"
            class="rounded-lg border border-default bg-default/60 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-highlighted">
                    {{ tool.title }}
                  </p>
                  <UBadge color="primary" variant="soft">
                    Model-facing
                  </UBadge>
                </div>
                <p class="mt-1 text-sm text-muted">
                  {{ tool.description }}
                </p>
                <p class="mt-2 text-xs text-muted">
                  <UIcon name="i-lucide-shield" class="mr-1 inline size-3 align-text-bottom" />
                  Returns sanitized metadata only — no raw rows or storage paths.
                </p>
              </div>
              <UBadge color="neutral" variant="outline">
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
        </div>

        <!-- Nitro tasks tab -->
        <div v-else-if="item.value === 'tasks'" class="mt-4 space-y-4">
          <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
            <h3 class="text-sm font-semibold text-highlighted">
              Probe runner
            </h3>
            <p class="text-xs text-muted">
              Probes verify whether each expected task can be executed by Nitro in the running server.
            </p>

            <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <DevtoolsDatasetPicker
                v-model="datasetId"
                :datasets="datasets"
                :loading="datasetsPending"
                placeholder="Pick a dataset to probe"
              />
              <UButton
                icon="i-lucide-zap"
                label="Probe all tasks"
                color="primary"
                :loading="probingAll"
                :disabled="!datasetId || probingAll"
                @click="probeAllTasks"
              />
            </div>
          </UCard>

          <div
            v-for="task in data?.expectedNitroTasks || []"
            :key="task.name"
            class="rounded-lg border border-default bg-default/60 p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-mono text-sm text-highlighted">
                  {{ task.name }}
                </p>
                <p class="mt-1 text-sm text-muted">
                  {{ task.description }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <DevtoolsStatusBadge :status="statusFor(task.name)" />
                <UButton
                  size="xs"
                  icon="i-lucide-play"
                  label="Probe"
                  color="neutral"
                  variant="outline"
                  :loading="probingTaskName === task.name"
                  :disabled="!datasetId || probingTaskName === task.name || probingAll"
                  @click="probeTask(task.name)"
                />
              </div>
            </div>

            <div
              v-if="probeResults[task.name]"
              class="mt-3 space-y-2"
            >
              <div
                v-if="probeResults[task.name]?.ok"
                class="rounded-md border border-default bg-elevated/40 px-3 py-2 text-xs text-muted"
              >
                <span class="font-medium text-highlighted">Passed</span>
                <span v-if="probeResults[task.name]?.durationMs !== undefined" class="ml-2">
                  · {{ probeResults[task.name]?.durationMs }}ms
                </span>
                <span
                  v-if="probeResults[task.name]?.resultShape?.findingCount !== undefined"
                  class="ml-2"
                >
                  · {{ probeResults[task.name]?.resultShape?.findingCount }} findings
                </span>
              </div>

              <UAlert
                v-else
                color="error"
                variant="soft"
                icon="i-lucide-circle-alert"
                :title="probeResults[task.name]?.error?.statusMessage || 'Task probe failed'"
                :description="probeResults[task.name]?.error?.message"
              />

              <DevtoolsJson
                title="Probe result"
                :value="probeResults[task.name]"
                collapsed
              />
            </div>

            <DevtoolsJson
              class="mt-3"
              title="Input schema"
              :value="task.inputSchema"
              collapsed
            />
          </div>
        </div>
      </template>
    </UTabs>
  </div>
</template>
