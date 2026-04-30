<script setup lang="ts">
import type { PublicDataset, SafeWorkflowRunSummary } from '@datagate/shared'

type SortKey = 'newest' | 'oldest' | 'filename' | 'size'

const props = defineProps<{
  initialDatasetId?: string
  activeChatDatasetId?: string | null
}>()

const toast = useToast()
const { csrf, headerName } = useCsrf()

const {
  data,
  pending,
  error,
  refresh
} = await useFetch<{ datasets: PublicDataset[] }>('/api/devtools/datasets', {
  default: () => ({ datasets: [] })
})

const search = ref('')
const sortKey = ref<SortKey>('newest')
const mimeFilter = ref<string>('all')
const selectedDatasetId = ref<string>(props.initialDatasetId || '')
const detailOpen = ref(Boolean(props.initialDatasetId))
const runningDatasetId = ref<string>()
const lastRunSummary = ref<{ datasetId: string, summary: SafeWorkflowRunSummary } | null>(null)
const lastRunError = ref<{ datasetId: string, message: string } | null>(null)

const datasets = computed(() => data.value?.datasets ?? [])

const mimeOptions = computed(() => {
  const set = new Set<string>()
  datasets.value.forEach(dataset => set.add(dataset.mimeType))
  return [
    { label: 'All types', value: 'all' },
    ...Array.from(set).map(type => ({ label: type, value: type }))
  ]
})

const sortOptions: { label: string, value: SortKey }[] = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Filename A→Z', value: 'filename' },
  { label: 'Largest size', value: 'size' }
]

const filteredDatasets = computed(() => {
  const term = search.value.trim().toLowerCase()
  let result = datasets.value.slice()

  if (term) {
    result = result.filter(dataset =>
      dataset.filename.toLowerCase().includes(term)
      || dataset.id.toLowerCase().includes(term)
    )
  }

  if (mimeFilter.value !== 'all') {
    result = result.filter(dataset => dataset.mimeType === mimeFilter.value)
  }

  switch (sortKey.value) {
    case 'oldest':
      result.sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))
      break
    case 'filename':
      result.sort((a, b) => a.filename.localeCompare(b.filename))
      break
    case 'size':
      result.sort((a, b) => b.size - a.size)
      break
    case 'newest':
    default:
      result.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      break
  }

  return result
})

const selectedDataset = computed(() =>
  datasets.value.find(dataset => dataset.id === selectedDatasetId.value) ?? null
)

function selectDataset(dataset: PublicDataset) {
  selectedDatasetId.value = dataset.id
  detailOpen.value = true
}

async function copyDatasetId(dataset: PublicDataset) {
  await navigator.clipboard.writeText(dataset.id)
  toast.add({
    title: 'Dataset id copied',
    description: dataset.filename,
    color: 'success',
    icon: 'i-lucide-check'
  })
}

async function runQualityGate(dataset: PublicDataset) {
  runningDatasetId.value = dataset.id
  lastRunError.value = null

  try {
    const summary = await $fetch<SafeWorkflowRunSummary>(
      `/api/datasets/${dataset.id}/workflows/default-quality-gate/run`,
      {
        method: 'POST',
        headers: { [headerName]: csrf }
      }
    )

    lastRunSummary.value = { datasetId: dataset.id, summary }
    toast.add({
      title: 'Quality gate completed',
      description: dataset.filename,
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Workflow run failed.'
    lastRunError.value = { datasetId: dataset.id, message }
    toast.add({
      title: 'Quality gate failed',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    runningDatasetId.value = undefined
  }
}

function openReport(reportId: string) {
  window.open(`/artifacts/${reportId}`, '_blank', 'noopener')
}

function rowActions(dataset: PublicDataset) {
  const actions: Array<Array<{ label: string, icon: string, onSelect: () => void, disabled?: boolean }>> = [
    [
      {
        label: 'Inspect',
        icon: 'i-lucide-eye',
        onSelect: () => selectDataset(dataset)
      },
      {
        label: 'Copy dataset id',
        icon: 'i-lucide-copy',
        onSelect: () => { void copyDatasetId(dataset) }
      }
    ],
    [
      {
        label: runningDatasetId.value === dataset.id ? 'Running…' : 'Run Default Quality Gate',
        icon: 'i-lucide-shield-check',
        disabled: Boolean(runningDatasetId.value),
        onSelect: () => { void runQualityGate(dataset) }
      }
    ]
  ]

  if (props.activeChatDatasetId !== undefined) {
    actions.push([
      {
        label: 'Attach to current chat',
        icon: 'i-lucide-link',
        disabled: !props.activeChatDatasetId,
        onSelect: () => {
          toast.add({
            title: 'Attach via chat composer',
            description: 'Use the chat composer to swap the active dataset.',
            color: 'neutral',
            icon: 'i-lucide-info'
          })
        }
      }
    ])
  }

  return actions
}

function formatBytes(value: number) {
  const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${formatter.format(value / 1024)} KB`
  return `${formatter.format(value / (1024 * 1024))} MB`
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}

watch(() => props.initialDatasetId, (id) => {
  if (id) {
    selectedDatasetId.value = id
    detailOpen.value = true
  }
})

const selectedRunInfo = computed(() => {
  if (!selectedDataset.value) return null
  if (lastRunSummary.value?.datasetId === selectedDataset.value.id) return lastRunSummary.value.summary
  return null
})

const selectedRunError = computed(() => {
  if (!selectedDataset.value) return null
  if (lastRunError.value?.datasetId === selectedDataset.value.id) return lastRunError.value.message
  return null
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Datasets
        </h2>
        <p class="text-sm text-muted">
          Search, inspect, and run workflows. Storage paths and raw rows stay hidden.
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

    <UCard :ui="{ root: 'bg-default/60', body: 'space-y-4' }">
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search filename or dataset id"
          class="w-full"
        />
        <USelect
          v-model="sortKey"
          :items="sortOptions"
          icon="i-lucide-arrow-down-up"
          class="w-full md:w-48"
        />
        <USelect
          v-model="mimeFilter"
          :items="mimeOptions"
          icon="i-lucide-filter"
          class="w-full md:w-44"
          :disabled="mimeOptions.length <= 1"
        />
      </div>

      <div class="text-xs text-muted">
        {{ filteredDatasets.length }} of {{ datasets.length }} datasets shown.
      </div>
    </UCard>

    <div class="overflow-hidden rounded-lg border border-default bg-default/60">
      <div
        v-if="pending"
        class="flex items-center gap-2 p-6 text-sm text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
        Loading datasets...
      </div>

      <div
        v-else-if="filteredDatasets.length === 0"
        class="p-6 text-sm text-muted"
      >
        <p v-if="datasets.length === 0">
          No datasets uploaded yet. Use the chat composer or the Datasets page to upload a CSV.
        </p>
        <p v-else>
          No datasets match the current search or filter.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-[60rem] w-full divide-y divide-default text-sm">
          <thead class="bg-elevated text-left text-muted">
            <tr>
              <th class="px-4 py-2 font-medium">
                Filename
              </th>
              <th class="px-4 py-2 font-medium">
                Uploaded
              </th>
              <th class="px-4 py-2 font-medium">
                Size
              </th>
              <th class="px-4 py-2 font-medium">
                MIME
              </th>
              <th class="px-4 py-2 font-medium">
                ID
              </th>
              <th class="px-4 py-2 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="dataset in filteredDatasets"
              :key="dataset.id"
              class="cursor-pointer transition-colors hover:bg-elevated/40"
              :class="dataset.id === selectedDatasetId ? 'bg-primary/5' : ''"
              @click="selectDataset(dataset)"
            >
              <td class="px-4 py-3 font-medium text-highlighted">
                {{ dataset.filename }}
              </td>
              <td class="px-4 py-3 text-muted">
                {{ formatDate(dataset.uploadedAt) }}
              </td>
              <td class="px-4 py-3 text-muted">
                {{ formatBytes(dataset.size) }}
              </td>
              <td class="px-4 py-3 text-muted">
                {{ dataset.mimeType }}
              </td>
              <td class="px-4 py-3 font-mono text-xs text-muted">
                {{ dataset.id.slice(0, 8) }}…
              </td>
              <td class="px-4 py-3" @click.stop>
                <div class="flex justify-end gap-1">
                  <UButton
                    icon="i-lucide-shield-check"
                    label="Run gate"
                    size="xs"
                    color="primary"
                    variant="soft"
                    :loading="runningDatasetId === dataset.id"
                    :disabled="Boolean(runningDatasetId)"
                    @click="runQualityGate(dataset)"
                  />
                  <UDropdownMenu :items="rowActions(dataset)">
                    <UButton
                      icon="i-lucide-more-vertical"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      aria-label="More actions"
                    />
                  </UDropdownMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <USlideover v-model:open="detailOpen" :title="selectedDataset?.filename || 'Dataset'">
      <template #body>
        <div v-if="selectedDataset" class="space-y-5">
          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Filename
            </p>
            <p class="text-sm text-highlighted">
              {{ selectedDataset.filename }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Size
              </p>
              <p class="mt-1 text-sm text-highlighted">
                {{ formatBytes(selectedDataset.size) }}
              </p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                MIME type
              </p>
              <p class="mt-1 text-sm text-highlighted">
                {{ selectedDataset.mimeType }}
              </p>
            </div>
            <div class="col-span-2">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Uploaded at
              </p>
              <p class="mt-1 text-sm text-highlighted">
                {{ formatDate(selectedDataset.uploadedAt) }}
              </p>
            </div>
          </div>

          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Dataset id
            </p>
            <div class="mt-1 flex items-center gap-2 rounded-md border border-default bg-elevated/40 px-2 py-1.5">
              <code class="flex-1 truncate font-mono text-xs text-highlighted">
                {{ selectedDataset.id }}
              </code>
              <UButton
                icon="i-lucide-copy"
                size="xs"
                color="neutral"
                variant="ghost"
                aria-label="Copy dataset id"
                @click="copyDatasetId(selectedDataset)"
              />
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Actions
            </p>
            <div class="grid gap-2">
              <UButton
                icon="i-lucide-shield-check"
                label="Run Default Quality Gate"
                color="primary"
                block
                :loading="runningDatasetId === selectedDataset.id"
                :disabled="Boolean(runningDatasetId)"
                @click="runQualityGate(selectedDataset)"
              />
              <UButton
                icon="i-lucide-copy"
                label="Copy dataset id"
                color="neutral"
                variant="outline"
                block
                @click="copyDatasetId(selectedDataset)"
              />
              <UButton
                v-if="selectedRunInfo?.reportArtifactId"
                icon="i-lucide-file-text"
                label="Open generated report"
                color="neutral"
                variant="outline"
                block
                @click="openReport(selectedRunInfo.reportArtifactId)"
              />
            </div>
          </div>

          <div v-if="selectedRunError" class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Latest workflow
            </p>
            <UAlert
              color="error"
              variant="soft"
              icon="i-lucide-circle-alert"
              title="Run failed"
              :description="selectedRunError"
            />
          </div>

          <div v-if="selectedRunInfo" class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              Latest workflow
            </p>
            <div class="rounded-md border border-default bg-default/60 p-3 text-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="text-muted">Status</span>
                <DevtoolsStatusBadge
                  :status="selectedRunInfo.status === 'completed' ? 'passed' : 'failed'"
                  :label="selectedRunInfo.status === 'completed' ? 'Completed' : 'Failed'"
                />
              </div>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-muted">Quality score</span>
                <span class="font-semibold text-highlighted">
                  {{ selectedRunInfo.qualityScore.score }}/{{ selectedRunInfo.qualityScore.maxScore }}
                </span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-muted">Critical / High</span>
                <span class="font-mono text-xs text-highlighted">
                  {{ selectedRunInfo.severityCounts.critical }} / {{ selectedRunInfo.severityCounts.high }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
