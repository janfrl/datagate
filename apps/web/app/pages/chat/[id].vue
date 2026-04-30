<script setup lang="ts">
import { Chat } from '@ai-sdk/vue'
import type { PublicDataset } from '@datagate/shared'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'

const route = useRoute()
const toast = useToast()
const { model, provider } = useModels()
const { csrf, headerName } = useCsrf()

const { data } = await useFetch(`/api/chats/${route.params.id}`, {
  key: `chat-${route.params.id}`,
  cache: 'force-cache'
})

const isOwner = computed(() => data.value?.isOwner ?? false)
const visibility = ref<'public' | 'private'>(data.value?.visibility ?? 'private')
const title = ref<string | null>(data.value?.title ?? null)
const activeDataset = ref<PublicDataset | null>(data.value?.activeDataset ?? null)

watch(() => data.value?.title, (next) => {
  title.value = next ?? null
})

watch(() => data.value?.activeDataset, (next) => {
  activeDataset.value = next ?? null
})

const { data: votes } = await useLazyFetch(`/api/chats/${route.params.id}/votes`, {
  immediate: isOwner.value
})

const input = ref('')
const datasetFileInput = ref<HTMLInputElement>()
const { uploading: datasetUploading, error: datasetUploadError, uploadDatasetFile } = useDatasetUpload()

const chat = new Chat({
  id: data.value?.id,
  messages: data.value?.messages,
  transport: new DefaultChatTransport({
    api: `/api/chats/${data.value?.id}`,
    headers: { [headerName]: csrf },
    body: {
      provider: provider.value,
      model: model.value
    }
  }),
  onData: async (dataPart) => {
    if (dataPart.type === 'data-chat-title') {
      await refreshNuxtData('chats')
      const chatsCache = useNuxtData<{ id: string, label: string }[]>('chats')
      const updated = chatsCache.data.value?.find(c => c.id === data.value!.id)
      if (updated && updated.label !== 'Untitled') {
        title.value = updated.label
      }
    }
  },
  onError(error) {
    let message = error.message
    if (typeof message === 'string' && message[0] === '{') {
      try {
        message = JSON.parse(message).message || message
      } catch {
        // keep original message on malformed JSON
      }
    }

    toast.add({
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0
    })
  }
})

async function handleSubmit(e: Event) {
  e.preventDefault()
  if (input.value.trim()) {
    chat.sendMessage({
      text: input.value
    })
    input.value = ''
  }
}

function openDatasetFilePicker() {
  if (!datasetUploading.value && chat.status !== 'streaming') {
    datasetFileInput.value?.click()
  }
}

async function onDatasetFileChange(event: Event) {
  const fileInput = event.target as HTMLInputElement
  const file = fileInput.files?.[0]

  if (!file) return

  try {
    const dataset = await uploadDatasetFile(file, { chatId: data.value!.id })
    activeDataset.value = dataset
    toast.add({
      title: 'File attached',
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

const editingMessageId = ref<string | null>(null)

function startEdit(message: UIMessage) {
  if (editingMessageId.value) return

  editingMessageId.value = message.id
}

async function saveEdit(message: UIMessage, text: string) {
  try {
    await $fetch(`/api/chats/${data.value!.id}/messages`, {
      method: 'DELETE',
      headers: { [headerName]: csrf },
      body: { messageId: message.id, type: 'edit' }
    })
  } catch {
    toast.add({ description: 'Failed to save edit.', icon: 'i-lucide-alert-circle', color: 'error' })
    return
  }

  editingMessageId.value = null
  chat.sendMessage({ text, messageId: message.id })
}

async function regenerateMessage(message: UIMessage) {
  try {
    await $fetch(`/api/chats/${data.value!.id}/messages`, {
      method: 'DELETE',
      headers: { [headerName]: csrf },
      body: { messageId: message.id, type: 'regenerate' }
    })
  } catch {
    toast.add({ description: 'Failed to regenerate.', icon: 'i-lucide-alert-circle', color: 'error' })
    return
  }

  chat.regenerate({ messageId: message.id })
}

function getVote(messageId: string) {
  const vote = votes.value?.find(v => v.messageId === messageId)
  if (!vote) return null
  return !!vote.isUpvoted
}

async function vote(message: UIMessage, isUpvoted: boolean) {
  const snapshot = (votes.value ?? []).map(v => ({ ...v }))
  const toggling = getVote(message.id) === isUpvoted
  const next = toggling ? null : isUpvoted

  votes.value = next === null
    ? (votes.value ?? []).filter(v => v.messageId !== message.id)
    : [
        ...(votes.value ?? []).filter(v => v.messageId !== message.id),
        { chatId: data.value!.id, messageId: message.id, isUpvoted: next }
      ]

  try {
    await $fetch(`/api/chats/${data.value!.id}/votes`, {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: next === null ? { messageId: message.id } : { messageId: message.id, isUpvoted: next }
    })
  } catch {
    votes.value = snapshot
    toast.add({
      description: 'Failed to save vote',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

onMounted(() => {
  if (isOwner.value && data.value?.messages.length === 1) {
    chat.regenerate()
  }
})
</script>

<template>
  <UDashboardPanel
    v-if="data?.id"
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <ChatTitle
            :chat-id="data!.id"
            :title="title"
            :is-owner="isOwner"
            @update:title="title = $event"
          />
        </template>

        <ChatVisibility
          v-if="isOwner"
          :chat-id="data!.id"
          :visibility="visibility"
          @update:visibility="visibility = $event"
        />
      </Navbar>
    </template>

    <template #body>
      <div class="flex flex-1">
        <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
          <UChatMessages
            should-auto-scroll
            :messages="chat.messages"
            :status="chat.status"
            :spacing-offset="isOwner ? 120 : 0"
            class="pt-(--ui-header-height) pb-4 sm:pb-6"
          >
            <template #indicator>
              <div class="flex items-center gap-1.5">
                <ChatIndicator />

                <UChatShimmer text="Thinking..." class="text-sm" />
              </div>
            </template>

            <template #files="{ message, parts }">
              <ChatFilePreview
                v-for="(part, index) in parts"
                :key="`${message.id}-${index}`"
                :name="getFileName(part.url)"
                :type="part.mediaType"
                :preview-url="part.url"
                size="3xl"
              />
            </template>

            <template #content="{ message }">
              <ChatMessageContent
                :message="message"
                :editing="isOwner && editingMessageId === message.id"
                @save="saveEdit"
                @cancel-edit="editingMessageId = null"
              />
            </template>

            <template v-if="isOwner" #actions="{ message }">
              <ChatMessageActions
                :message="message"
                :streaming="chat.status === 'streaming' && message.id === chat.messages[chat.messages.length - 1]?.id"
                :editing="editingMessageId === message.id"
                :vote="getVote(message.id)"
                @vote="(_message, isUpvoted) => vote(_message, isUpvoted)"
                @edit="startEdit"
                @regenerate="regenerateMessage"
              />
            </template>
          </UChatMessages>

          <UAlert
            v-if="datasetUploadError"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            class="sticky bottom-20 z-10"
            :description="datasetUploadError"
          />

          <UChatPrompt
            v-if="isOwner"
            v-model="input"
            :error="chat.error"
            variant="subtle"
            class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
            :ui="{ base: 'px-1.5' }"
            @submit="handleSubmit"
          >
            <template #footer>
              <div class="flex min-w-0 flex-1 items-center gap-1">
                <input
                  ref="datasetFileInput"
                  type="file"
                  accept=".csv,text/csv"
                  class="hidden"
                  @change="onDatasetFileChange"
                >
                <ChatFileUploadButton
                  :open="openDatasetFilePicker"
                  :loading="datasetUploading"
                  :disabled="chat.status === 'streaming'"
                />
                <ModelSelect />
                <UBadge
                  v-if="activeDataset"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-paperclip"
                  :label="`Attached ${activeDataset.filename}`"
                  class="ml-1 max-w-[min(20rem,45vw)] truncate"
                />
              </div>

              <UChatPromptSubmit
                :status="chat.status"
                color="neutral"
                size="sm"
                @stop="chat.stop()"
                @reload="chat.regenerate()"
              />
            </template>
          </UChatPrompt>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>

  <UContainer v-else class="flex-1 flex flex-col gap-4 sm:gap-6">
    <UError :error="{ statusMessage: 'Chat not found', statusCode: 404 }" class="min-h-full" />
  </UContainer>
</template>
