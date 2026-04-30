import type { PublicDataset } from '@datagate/shared'

const csvMimeTypes = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel'
])

export function useDatasetUpload() {
  const { csrf, headerName } = useCsrf()
  const uploading = ref(false)
  const error = ref<string>()

  async function uploadDatasetFile(file?: File): Promise<PublicDataset> {
    error.value = undefined

    if (!file) {
      error.value = 'Choose a CSV file before uploading.'
      throw new Error(error.value)
    }

    if (!isCsvFile(file)) {
      error.value = 'Only CSV files can be uploaded as datasets.'
      throw new Error(error.value)
    }

    uploading.value = true

    try {
      const formData = new FormData()
      formData.append('file', file)

      const dataset = await $fetch<PublicDataset>('/api/datasets/upload', {
        method: 'POST',
        headers: { [headerName]: csrf },
        body: formData
      })

      await refreshNuxtData('datasets')
      return dataset
    } catch (uploadError) {
      error.value = getDatasetUploadError(uploadError)
      throw new Error(error.value)
    } finally {
      uploading.value = false
    }
  }

  return {
    uploading,
    error,
    uploadDatasetFile
  }
}

function isCsvFile(file: File) {
  const type = file.type.toLowerCase()
  return file.name.toLowerCase().endsWith('.csv') || csvMimeTypes.has(type)
}

function getDatasetUploadError(error: unknown) {
  const fetchError = error as {
    data?: {
      message?: string
      statusMessage?: string
    }
    message?: string
  }

  return fetchError.data?.statusMessage
    || fetchError.data?.message
    || fetchError.message
    || 'Dataset upload failed.'
}
