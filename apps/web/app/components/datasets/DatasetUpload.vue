<script setup lang="ts">
import type { Dataset } from '@datagate/shared'

const emit = defineEmits<{
  uploaded: [dataset: Dataset]
}>()

const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const uploading = ref(false)
const error = ref<string>()

const { csrf, headerName } = useCsrf()
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
  if (!selectedFile.value) {
    error.value = 'Choose a CSV file before uploading.'
    return
  }

  uploading.value = true
  error.value = undefined

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const dataset = await $fetch<Dataset>('/api/datasets/upload', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: formData
    })

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
  } catch (uploadError) {
    error.value = uploadError instanceof Error ? uploadError.message : 'Upload failed.'
  } finally {
    uploading.value = false
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
