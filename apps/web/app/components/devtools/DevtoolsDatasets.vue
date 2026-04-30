<script setup lang="ts">
import type { PublicDataset } from '@datagate/shared'

const toast = useToast()

const {
  data,
  pending,
  error,
  refresh
} = await useFetch<{ datasets: PublicDataset[] }>('/api/devtools/datasets', {
  default: () => ({ datasets: [] })
})

const selectedDatasetId = ref('')

function selectDataset(dataset: PublicDataset) {
  selectedDatasetId.value = dataset.id
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

function formatBytes(value: number) {
  const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${formatter.format(value / 1024)} KB`
  return `${formatter.format(value / (1024 * 1024))} MB`
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Datasets
        </h2>
        <p class="text-sm text-muted">
          Metadata only. Storage paths and raw CSV rows are not shown.
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

    <UInput
      v-model="selectedDatasetId"
      icon="i-lucide-database"
      placeholder="Selected dataset id"
      readonly
    />

    <div class="overflow-hidden rounded-lg border border-default bg-default/60">
      <div
        v-if="pending"
        class="flex items-center gap-2 p-6 text-sm text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
        Loading datasets...
      </div>

      <div
        v-else-if="data.datasets.length === 0"
        class="p-6 text-sm text-muted"
      >
        No datasets uploaded yet.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-[56rem] w-full divide-y divide-default text-sm">
          <thead class="bg-elevated text-left text-muted">
            <tr>
              <th class="px-3 py-2 font-medium">
                Filename
              </th>
              <th class="px-3 py-2 font-medium">
                Dataset id
              </th>
              <th class="px-3 py-2 font-medium">
                Size
              </th>
              <th class="px-3 py-2 font-medium">
                MIME type
              </th>
              <th class="px-3 py-2 font-medium">
                Uploaded
              </th>
              <th class="px-3 py-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="dataset in data.datasets"
              :key="dataset.id"
            >
              <td class="px-3 py-3 font-medium text-highlighted">
                {{ dataset.filename }}
              </td>
              <td class="max-w-[18rem] truncate px-3 py-3 font-mono text-xs text-muted">
                {{ dataset.id }}
              </td>
              <td class="px-3 py-3 text-muted">
                {{ formatBytes(dataset.size) }}
              </td>
              <td class="px-3 py-3 text-muted">
                {{ dataset.mimeType }}
              </td>
              <td class="px-3 py-3 text-muted">
                {{ dataset.uploadedAt }}
              </td>
              <td class="px-3 py-3">
                <div class="flex justify-end gap-1">
                  <UButton
                    icon="i-lucide-mouse-pointer-click"
                    color="neutral"
                    variant="ghost"
                    aria-label="Select dataset"
                    @click="selectDataset(dataset)"
                  />
                  <UButton
                    icon="i-lucide-copy"
                    color="neutral"
                    variant="ghost"
                    aria-label="Copy dataset id"
                    @click="copyDatasetId(dataset)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
