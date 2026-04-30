<script setup lang="ts">
import type { PublicDataset } from '@datagate/shared'

type DatasetOption = {
  id: string
  label: string
  description: string
  filename: string
  uploadedAt: string
  size: number
  mimeType: string
  shortId: string
}

const props = defineProps<{
  datasets: PublicDataset[]
  modelValue?: string
  placeholder?: string
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const options = computed<DatasetOption[]>(() => props.datasets.map((dataset) => {
  const shortId = dataset.id.slice(0, 8)
  return {
    id: dataset.id,
    label: dataset.filename,
    description: `${formatDate(dataset.uploadedAt)} · ${shortId}…`,
    filename: dataset.filename,
    uploadedAt: dataset.uploadedAt,
    size: dataset.size,
    mimeType: dataset.mimeType,
    shortId
  }
}))

const selectedOption = computed(() => options.value.find(option => option.id === props.modelValue))

function onUpdate(option: DatasetOption | null | undefined) {
  emit('update:modelValue', option?.id ?? '')
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}
</script>

<template>
  <USelectMenu
    :model-value="selectedOption"
    :items="options"
    :placeholder="placeholder || (options.length === 0 ? 'No datasets uploaded' : 'Select a dataset')"
    icon="i-lucide-database"
    :loading="loading"
    :disabled="disabled || options.length === 0"
    :search-input="{ placeholder: 'Search filename or id…' }"
    by="id"
    class="w-full"
    @update:model-value="onUpdate"
  >
    <template #item="{ item }">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <UIcon name="i-lucide-file-spreadsheet" class="size-4 shrink-0 text-muted" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ item.filename }}
          </p>
          <p class="truncate text-xs text-muted">
            {{ formatDate(item.uploadedAt) }} · {{ item.shortId }}…
          </p>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>
