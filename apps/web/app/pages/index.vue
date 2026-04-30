<script setup lang="ts">
import type { PublicDataset } from '@datagate/shared'

const input = ref('')
const loading = ref(false)
const datasetFileInput = ref<HTMLInputElement>()
const latestUploadedDataset = ref<PublicDataset>()

const { csrf, headerName } = useCsrf()
const { uploading: datasetUploading, error: datasetUploadError, uploadDatasetFile } = useDatasetUpload()
const toast = useToast()

async function createChat(prompt: string) {
  const text = prompt.trim()
  if (!text || loading.value) return

  input.value = text
  loading.value = true
  const chatId = crypto.randomUUID()

  const parts: Array<{ type: string, text?: string, mediaType?: string, url?: string }> = [{ type: 'text', text }]

  try {
    const chat = await $fetch('/api/chats', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: {
        id: chatId,
        message: {
          id: crypto.randomUUID(),
          role: 'user',
          parts
        }
      }
    })

    await navigateTo(`/chat/${chat.id}`)
    await refreshNuxtData('chats')
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  await createChat(input.value)
}

function openDatasetFilePicker() {
  if (!datasetUploading.value) {
    datasetFileInput.value?.click()
  }
}

async function onDatasetFileChange(event: Event) {
  const fileInput = event.target as HTMLInputElement
  const file = fileInput.files?.[0]

  if (!file) return

  try {
    latestUploadedDataset.value = undefined
    const dataset = await uploadDatasetFile(file)
    latestUploadedDataset.value = dataset
    toast.add({
      title: 'Dataset uploaded',
      description: dataset.filename,
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch {
    toast.add({
      title: 'Dataset upload failed',
      description: datasetUploadError.value,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    fileInput.value = ''
  }
}

const quickChats = [
  {
    label: 'What should I check before using a CSV with AI?',
    icon: 'i-lucide-file-spreadsheet'
  },
  {
    label: 'How do I describe dataset quality to a teammate?',
    icon: 'i-lucide-message-square-text'
  },
  {
    label: 'What makes a dataset ready for model evaluation?',
    icon: 'i-lucide-clipboard-check'
  },
  {
    label: 'Analyze my latest dataset',
    icon: 'i-lucide-shield-check'
  },
  {
    label: 'List common privacy risks in tabular data',
    icon: 'i-lucide-shield-alert'
  },
  {
    label: 'Draft a simple data quality checklist',
    icon: 'i-lucide-list-checks'
  }
]
</script>

<template>
  <UDashboardPanel
    id="home"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <div class="flex flex-1">
        <UContainer class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
          <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
            Data Gate
          </h1>
          <p class="text-base sm:text-lg text-muted">
            Local-first AI data quality checker
          </p>

          <div>
            <input
              ref="datasetFileInput"
              type="file"
              accept=".csv,text/csv"
              class="hidden"
              @change="onDatasetFileChange"
            >

            <UButton
              type="button"
              icon="i-lucide-upload"
              label="Upload dataset"
              color="neutral"
              variant="outline"
              :loading="datasetUploading"
              @click="openDatasetFilePicker"
            />
          </div>

          <UAlert
            v-if="latestUploadedDataset"
            color="success"
            variant="soft"
            icon="i-lucide-check"
            :title="`Dataset uploaded: ${latestUploadedDataset.filename}`"
            description="Ask the chat to analyze it, or use the Analyze my latest dataset suggestion."
          />

          <UAlert
            v-else-if="datasetUploadError"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :description="datasetUploadError"
          />

          <UChatPrompt
            v-model="input"
            :status="loading ? 'streaming' : 'ready'"
            class="[view-transition-name:chat-prompt]"
            variant="subtle"
            :ui="{ base: 'px-1.5' }"
            @submit="onSubmit"
          >
            <template #footer>
              <div class="flex items-center gap-1">
                <ChatFileUploadButton
                  :open="openDatasetFilePicker"
                  :loading="datasetUploading"
                  :disabled="loading"
                />
                <ModelSelect />
              </div>

              <UChatPromptSubmit color="neutral" size="sm" />
            </template>
          </UChatPrompt>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="quickChat in quickChats"
              :key="quickChat.label"
              :icon="quickChat.icon"
              :label="quickChat.label"
              size="sm"
              color="neutral"
              variant="outline"
              class="rounded-full"
              @click="createChat(quickChat.label)"
            />
          </div>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
