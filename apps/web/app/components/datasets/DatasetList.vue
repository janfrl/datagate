<script setup lang="ts">
import type { Dataset, WorkflowRunResult } from '@datagate/shared'

const props = defineProps<{
  datasets: Dataset[]
  pending?: boolean
}>()

const emit = defineEmits<{
  workflowRun: [result: WorkflowRunResult]
}>()

const { csrf, headerName } = useCsrf()
const toast = useToast()

const runningDatasetId = ref<string>()
const runError = ref<string>()

const hasDatasets = computed(() => props.datasets.length > 0)

async function runDefaultQualityGate(dataset: Dataset) {
  runningDatasetId.value = dataset.id
  runError.value = undefined

  try {
    const result = await $fetch<WorkflowRunResult>(`/api/datasets/${dataset.id}/workflows/default-quality-gate/run`, {
      method: 'POST',
      headers: { [headerName]: csrf }
    })

    toast.add({
      title: 'Quality gate completed',
      description: dataset.filename,
      color: 'success',
      icon: 'i-lucide-check'
    })
    emit('workflowRun', result)
  } catch (error) {
    runError.value = error instanceof Error ? error.message : 'Workflow run failed.'
  } finally {
    runningDatasetId.value = undefined
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatBytes(value: number) {
  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1
  })

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${formatter.format(value / 1024)} KB`
  }

  return `${formatter.format(value / (1024 * 1024))} MB`
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <div class="border-b border-default px-4 py-3 sm:px-5">
      <h2 class="text-base font-semibold text-highlighted">
        Datasets
      </h2>
      <p class="text-sm text-muted">
        Run the Default Quality Gate against uploaded CSV files.
      </p>
    </div>

    <UAlert
      v-if="runError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="runError"
      class="m-4"
    />

    <div
      v-if="pending"
      class="flex items-center gap-2 px-4 py-8 text-sm text-muted sm:px-5"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-4 animate-spin"
      />
      Loading datasets...
    </div>

    <div
      v-else-if="!hasDatasets"
      class="px-4 py-8 text-sm text-muted sm:px-5"
    >
      No datasets uploaded yet.
    </div>

    <ul v-else class="divide-y divide-default">
      <li
        v-for="dataset in datasets"
        :key="dataset.id"
        class="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-highlighted">
            {{ dataset.filename }}
          </p>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>{{ formatDate(dataset.uploadedAt) }}</span>
            <span>{{ formatBytes(dataset.size) }}</span>
          </div>
        </div>

        <UButton
          icon="i-lucide-shield-check"
          label="Run Default Quality Gate"
          color="neutral"
          variant="outline"
          :loading="runningDatasetId === dataset.id"
          :disabled="Boolean(runningDatasetId)"
          class="self-start lg:self-auto"
          @click="runDefaultQualityGate(dataset)"
        />
      </li>
    </ul>
  </UCard>
</template>
