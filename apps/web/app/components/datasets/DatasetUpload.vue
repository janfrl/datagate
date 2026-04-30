<script setup lang="ts">
import type { PublicDataset } from '@datagate/shared'

const emit = defineEmits<{
  uploaded: [dataset: PublicDataset]
}>()

const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const { uploading, error, uploadDatasetFile } = useDatasetUpload()
const toast = useToast()

const canUpload = computed(() => Boolean(selectedFile.value) && !uploading.value)

function onFileChange(event: Event) {
  error.value = undefined
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    selectedFile.value = undefined
    return
  }

  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    selectedFile.value = undefined
    input.value = ''
    error.value = 'Choose a CSV file.'
    return
  }

  selectedFile.value = file
}

async function uploadDataset() {
  try {
    const dataset = await uploadDatasetFile(selectedFile.value)

    selectedFile.value = undefined
    if (fileInput.value) {
      fileInput.value.value = ''
    }

    toast.add({
      title: 'Dataset uploaded',
      description: dataset.filename,
      color: 'success',
      icon: 'i-lucide-check'
    })
    emit('uploaded', dataset)
  } catch {
    // The shared dataset upload composable owns the user-facing error message.
  }
}
</script>

<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-highlighted">
          Upload CSV
        </h2>
        <p class="text-sm text-muted">
          Add a local dataset for deterministic quality checks.
        </p>
      </div>

      <UIcon
        name="i-lucide-file-up"
        class="size-5 text-muted shrink-0"
      />
    </div>

    <form
      class="flex flex-col gap-3 sm:flex-row sm:items-center"
      @submit.prevent="uploadDataset"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".csv,text/csv"
        class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-sm file:font-medium file:text-highlighted hover:file:bg-accented"
        @change="onFileChange"
      >

      <UButton
        type="submit"
        icon="i-lucide-upload"
        label="Upload"
        :loading="uploading"
        :disabled="!canUpload"
        class="shrink-0"
      />
    </form>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="error"
    />
  </UCard>
</template>
