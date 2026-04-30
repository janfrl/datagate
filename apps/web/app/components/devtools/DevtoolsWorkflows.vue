<script setup lang="ts">
import type { PublicDataset } from '@datagate/shared'

type WorkflowDefinition = {
  id: string
  title: string
  description: string
  taskIds: string[]
}

type WorkflowsResponse = {
  workflows: WorkflowDefinition[]
}

type TaskRunResultLike = {
  toolId?: string
  scoreImpact?: number
  findings?: Array<{
    id: string
    severity?: string
    title?: string
  }>
}

type WorkflowRunResultLike = {
  id?: string
  workflowId?: string
  datasetId?: string
  status?: 'completed' | 'failed'
  qualityScore?: {
    score: number
    maxScore: number
  }
  summary?: {
    totalFindings?: number
    criticalFindings?: number
    highFindings?: number
    mediumFindings?: number
    lowFindings?: number
    infoFindings?: number
  }
  taskResults?: TaskRunResultLike[]
  artifacts?: { report?: string }
  startedAt?: string
  completedAt?: string
}

type WorkflowRunResponse
  = | {
    ok: true
    result: WorkflowRunResultLike
  }
  | {
    ok: false
    error: {
      message: string
      statusMessage?: string
      statusCode?: number
      stack?: string
    }
  }

const props = defineProps<{
  initialDatasetId?: string
  activeChatDatasetId?: string | null
}>()

const { csrf, headerName } = useCsrf()

const { data: workflowsData, pending: workflowsPending, error, refresh } = await useFetch<WorkflowsResponse>('/api/devtools/workflows')

const { data: datasetsData, pending: datasetsPending, refresh: refreshDatasets } = await useFetch<{ datasets: PublicDataset[] }>('/api/devtools/datasets', {
  default: () => ({ datasets: [] })
})

const datasets = computed(() => datasetsData.value?.datasets ?? [])
const datasetId = ref<string>(props.initialDatasetId || '')
const runPending = ref(false)
const runResponse = ref<WorkflowRunResponse | null>(null)

watch(() => props.initialDatasetId, (id) => {
  if (id) datasetId.value = id
})

const selectedDataset = computed(() => datasets.value.find(dataset => dataset.id === datasetId.value) ?? null)
const latestDataset = computed(() => datasets.value[0] ?? null)
const activeChatDataset = computed(() => datasets.value.find(d => d.id === props.activeChatDatasetId) ?? null)

const runResult = computed(() => {
  if (!runResponse.value || !runResponse.value.ok) return null
  return runResponse.value.result
})

const runError = computed(() => {
  if (!runResponse.value || runResponse.value.ok) return null
  return runResponse.value.error
})

async function runWorkflow() {
  if (!datasetId.value) return
  runPending.value = true
  runResponse.value = null

  try {
    runResponse.value = await $fetch<WorkflowRunResponse>('/api/devtools/workflows/run', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: {
        workflowId: 'default-quality-gate',
        datasetId: datasetId.value
      }
    })
  } catch (err) {
    runResponse.value = {
      ok: false,
      error: {
        message: err instanceof Error ? err.message : String(err)
      }
    }
  } finally {
    runPending.value = false
  }
}

function pickLatest() {
  if (latestDataset.value) datasetId.value = latestDataset.value.id
}

function pickActiveChat() {
  if (activeChatDataset.value) datasetId.value = activeChatDataset.value.id
}

function findingsCount(taskResult: TaskRunResultLike) {
  return taskResult.findings?.length ?? 0
}

const totalFindings = computed(() => {
  const summary = runResult.value?.summary
  if (!summary) return 0
  return (summary.criticalFindings ?? 0)
    + (summary.highFindings ?? 0)
    + (summary.mediumFindings ?? 0)
    + (summary.lowFindings ?? 0)
    + (summary.infoFindings ?? 0)
})

const reportArtifactId = computed(() => runResult.value?.artifacts?.report)
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Workflows
        </h2>
        <p class="text-sm text-muted">
          Run deterministic workflows and inspect results.
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        label="Refresh"
        color="neutral"
        variant="ghost"
        :loading="workflowsPending"
        @click="() => { void refresh(); void refreshDatasets() }"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="error.message"
    />

    <div
      v-for="workflow in workflowsData?.workflows || []"
      :key="workflow.id"
      class="rounded-lg border border-default bg-default/60 p-4"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h3 class="font-medium text-highlighted">
            {{ workflow.title }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ workflow.description }}
          </p>
        </div>
        <UBadge color="neutral" variant="soft">
          {{ workflow.id }}
        </UBadge>
      </div>

      <ol class="mt-4 grid gap-2 lg:grid-cols-2">
        <li
          v-for="(taskId, index) in workflow.taskIds"
          :key="taskId"
          class="flex items-center gap-3 rounded-md border border-default bg-elevated/50 px-3 py-2 text-sm"
        >
          <UBadge color="neutral" variant="outline">
            {{ index + 1 }}
          </UBadge>
          <span class="font-mono text-xs text-highlighted">{{ taskId }}</span>
        </li>
      </ol>
    </div>

    <UCard :ui="{ root: 'bg-default/60', body: 'space-y-4' }">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-highlighted">
            Run workbench · Default Quality Gate
          </h3>
          <p class="text-sm text-muted">
            Pick a dataset and execute the workflow. Run details appear below.
          </p>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wide text-muted">
            Dataset
          </label>
          <DevtoolsDatasetPicker
            v-model="datasetId"
            :datasets="datasets"
            :loading="datasetsPending"
            placeholder="Select a dataset"
          />
          <div class="flex flex-wrap gap-2 pt-1">
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-clock"
              :label="latestDataset ? `Latest: ${latestDataset.filename}` : 'No latest dataset'"
              :disabled="!latestDataset"
              @click="pickLatest"
            />
            <UButton
              v-if="props.activeChatDatasetId !== undefined"
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-message-square-text"
              :label="activeChatDataset ? `Active chat: ${activeChatDataset.filename}` : 'No active chat dataset'"
              :disabled="!activeChatDataset"
              @click="pickActiveChat"
            />
          </div>
        </div>

        <UButton
          icon="i-lucide-play"
          label="Run workflow"
          color="primary"
          size="md"
          :loading="runPending"
          :disabled="!datasetId"
          @click="runWorkflow"
        />
      </div>

      <div
        v-if="selectedDataset"
        class="rounded-md border border-default bg-elevated/40 px-3 py-2 text-sm"
      >
        <span class="text-muted">Selected:</span>
        <span class="ml-2 font-medium text-highlighted">{{ selectedDataset.filename }}</span>
        <span class="ml-2 font-mono text-xs text-muted">{{ selectedDataset.id.slice(0, 8) }}…</span>
      </div>
    </UCard>

    <!-- Run result panel -->
    <UCard
      v-if="runResult"
      :ui="{ root: 'bg-default/60', body: 'space-y-4' }"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-highlighted">
            Run result
          </h3>
          <p class="text-xs text-muted">
            Workflow run {{ runResult.id }}
          </p>
        </div>
        <DevtoolsStatusBadge
          :status="runResult.status === 'completed' ? 'passed' : 'failed'"
          :label="runResult.status === 'completed' ? 'Completed' : 'Failed'"
        />
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-md border border-default p-3">
          <p class="text-xs text-muted">
            Quality score
          </p>
          <p class="mt-1 text-2xl font-semibold text-highlighted">
            {{ runResult.qualityScore?.score ?? 0 }}/{{ runResult.qualityScore?.maxScore ?? 0 }}
          </p>
        </div>
        <div class="rounded-md border border-default p-3">
          <p class="text-xs text-muted">
            Total findings
          </p>
          <p class="mt-1 text-2xl font-semibold text-highlighted">
            {{ totalFindings }}
          </p>
        </div>
        <div class="rounded-md border border-default p-3">
          <p class="text-xs text-muted">
            Critical
          </p>
          <p class="mt-1 text-2xl font-semibold text-highlighted">
            {{ runResult.summary?.criticalFindings ?? 0 }}
          </p>
        </div>
        <div class="rounded-md border border-default p-3">
          <p class="text-xs text-muted">
            High
          </p>
          <p class="mt-1 text-2xl font-semibold text-highlighted">
            {{ runResult.summary?.highFindings ?? 0 }}
          </p>
        </div>
      </div>

      <div v-if="reportArtifactId" class="flex flex-col gap-2 rounded-md bg-elevated/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-medium text-highlighted">
            Generated report artifact
          </p>
          <p class="truncate font-mono text-xs text-muted">
            {{ reportArtifactId }}
          </p>
        </div>
        <UButton
          icon="i-lucide-file-text"
          label="Open report"
          color="neutral"
          :to="`/artifacts/${reportArtifactId}`"
          target="_blank"
        />
      </div>

      <div>
        <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Task results
        </h4>
        <div class="space-y-2">
          <div
            v-for="task in runResult.taskResults || []"
            :key="task.toolId || Math.random()"
            class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate font-mono text-xs text-highlighted">
                {{ task.toolId }}
              </p>
              <p class="text-xs text-muted">
                Score impact: {{ task.scoreImpact ?? 0 }} · Findings: {{ findingsCount(task) }}
              </p>
            </div>
            <DevtoolsStatusBadge
              :status="findingsCount(task) === 0 ? 'passed' : 'warning'"
              :label="findingsCount(task) === 0 ? 'Clean' : `${findingsCount(task)} finding${findingsCount(task) === 1 ? '' : 's'}`"
            />
          </div>
        </div>
      </div>

      <DevtoolsJson
        title="Raw workflow result"
        :value="runResult"
        collapsed
      />
    </UCard>

    <UCard
      v-else-if="runError"
      :ui="{ root: 'bg-default/60', body: 'space-y-3' }"
    >
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-highlighted">
          Run failed
        </h3>
        <DevtoolsStatusBadge status="failed" />
      </div>

      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="runError.statusMessage || 'Workflow run failed'"
        :description="runError.message"
      />

      <DevtoolsJson
        v-if="runError.stack"
        title="Stack trace"
        :value="runError.stack"
        collapsed
      />
    </UCard>
  </div>
</template>
