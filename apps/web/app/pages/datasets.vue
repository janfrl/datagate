<script setup lang="ts">
import type { PublicDataset, SafeWorkflowRunSummary } from '@datagate/shared'

const latestResult = ref<SafeWorkflowRunSummary>()

const {
  data: datasets,
  pending,
  refresh
} = await useFetch<PublicDataset[]>('/api/datasets', {
  default: () => []
})

const latestReportId = computed(() => latestResult.value?.reportArtifactId)
const latestSummary = computed(() => latestResult.value?.severityCounts)

async function onUploaded() {
  await refresh()
}

function onWorkflowRun(result: SafeWorkflowRunSummary) {
  latestResult.value = result
}
</script>

<template>
  <UDashboardPanel
    id="datasets"
    class="min-h-0"
  >
    <template #header>
      <Navbar>
        <template #title>
          <div class="min-w-0">
            <h1 class="truncate text-base font-semibold text-highlighted">
              Datasets
            </h1>
            <p class="text-sm text-muted">
              Upload CSV files and run the Default Quality Gate.
            </p>
          </div>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="w-full space-y-6 py-6">
        <DatasetUpload @uploaded="onUploaded" />

        <DatasetList
          :datasets="datasets || []"
          :pending="pending"
          @workflow-run="onWorkflowRun"
        />

        <UCard
          v-if="latestResult"
          :ui="{ body: 'space-y-5' }"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                Latest workflow result
              </h2>
              <p class="text-sm text-muted">
                Default Quality Gate completed for dataset {{ latestResult.datasetId }}.
              </p>
            </div>

            <UBadge
              color="success"
              variant="soft"
            >
              {{ latestResult.status }}
            </UBadge>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div class="rounded-md border border-default p-3">
              <p class="text-sm text-muted">
                Score
              </p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{ latestResult.qualityScore.score }}/{{ latestResult.qualityScore.maxScore }}
              </p>
            </div>

            <div class="rounded-md border border-default p-3">
              <p class="text-sm text-muted">
                Total findings
              </p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{
                  (latestSummary?.critical ?? 0)
                    + (latestSummary?.high ?? 0)
                    + (latestSummary?.medium ?? 0)
                    + (latestSummary?.low ?? 0)
                    + (latestSummary?.info ?? 0)
                }}
              </p>
            </div>

            <div class="rounded-md border border-default p-3">
              <p class="text-sm text-muted">
                Critical
              </p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{ latestSummary?.critical ?? 0 }}
              </p>
            </div>

            <div class="rounded-md border border-default p-3">
              <p class="text-sm text-muted">
                High
              </p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{ latestSummary?.high ?? 0 }}
              </p>
            </div>

            <div class="rounded-md border border-default p-3">
              <p class="text-sm text-muted">
                Medium
              </p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{ latestSummary?.medium ?? 0 }}
              </p>
            </div>

            <div class="rounded-md border border-default p-3">
              <p class="text-sm text-muted">
                Low
              </p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{ latestSummary?.low ?? 0 }}
              </p>
            </div>

            <div class="rounded-md border border-default p-3">
              <p class="text-sm text-muted">
                Info
              </p>
              <p class="mt-1 text-2xl font-semibold text-highlighted">
                {{ latestSummary?.info ?? 0 }}
              </p>
            </div>
          </div>

          <div
            v-if="latestReportId"
            class="flex flex-col gap-2 rounded-md bg-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                Generated report artifact
              </p>
              <p class="truncate text-sm text-muted">
                {{ latestReportId }}
              </p>
            </div>

            <UButton
              icon="i-lucide-file-text"
              label="Open report"
              color="neutral"
              :to="`/artifacts/${latestReportId}`"
              class="self-start sm:self-auto"
            />
          </div>
        </UCard>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
