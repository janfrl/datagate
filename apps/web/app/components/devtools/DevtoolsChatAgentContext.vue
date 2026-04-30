<script setup lang="ts">
const props = defineProps<{
  initialChatId?: string
}>()

const chatId = ref(props.initialChatId || '')
const loadedChatId = ref(props.initialChatId || '')

type DevtoolsChatContextResponse = {
  chatId: string | null
  activeDataset: unknown
  context: unknown
}

const {
  data,
  pending,
  error,
  refresh
} = await useFetch<DevtoolsChatContextResponse>('/api/devtools/chat-context', {
  query: computed(() => loadedChatId.value ? { chatId: loadedChatId.value } : {}),
  watch: [loadedChatId]
})

function loadContext() {
  loadedChatId.value = chatId.value.trim()
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold text-highlighted">
        Chat/Agent Context
      </h2>
      <p class="text-sm text-muted">
        Shows the sanitized context shape available to tools and the model. Raw dataset rows are not included.
      </p>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="chatId"
        icon="i-lucide-message-square"
        placeholder="Chat id"
        class="flex-1"
        @keyup.enter="loadContext"
      />
      <UButton
        icon="i-lucide-search"
        label="Load"
        color="neutral"
        @click="loadContext"
      />
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

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Current chat
        </h3>
        <DevtoolsJson
          title="Chat state"
          :value="{
            chatId: data?.chatId,
            activeDataset: data?.activeDataset
          }"
        />
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Sanitized model/tool context
        </h3>
        <DevtoolsJson
          title="Context payload"
          :value="data?.context"
        />
      </UCard>
    </div>
  </div>
</template>
