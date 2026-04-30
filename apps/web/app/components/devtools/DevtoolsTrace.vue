<script setup lang="ts">
type ToolCallSummary = {
  messageId: string
  toolName: string
  type: string
  createdAt: string
}

type ChatMessageSummary = {
  id: string
  role: 'user' | 'assistant' | 'system'
  partTypes: string[]
  createdAt: string
}

type ArtifactSummary = {
  id: string
  type: string
  title: string
  createdAt: string
}

type RecentChatSummary = {
  id: string
  title: string
  activeDatasetId: string | null
  createdAt: string
}

type ActiveDataset = {
  id: string
  filename: string
  size: number
  uploadedAt: string
}

type DevtoolsTraceResponse = {
  chatId: string | null
  activeDataset: ActiveDataset | null
  recentChats: RecentChatSummary[]
  context: {
    activeDataset: ActiveDataset | null
    toolNames: string[]
    messageCount?: number
    messages?: ChatMessageSummary[]
    lastUserMessagePreview?: string | null
    toolCalls?: ToolCallSummary[]
    errors?: Array<{ messageId: string, type: string, createdAt: string }>
    generatedArtifacts?: ArtifactSummary[]
    rawDatasetRowsIncluded: boolean
  }
}

const props = defineProps<{
  initialChatId?: string
}>()

const chatId = ref<string>(props.initialChatId || '')
const loadedChatId = ref<string>(props.initialChatId || '')

const { data, pending, error, refresh } = await useFetch<DevtoolsTraceResponse>('/api/devtools/chat-context', {
  query: computed(() => loadedChatId.value ? { chatId: loadedChatId.value } : {}),
  watch: [loadedChatId]
})

const recentChats = computed(() => data.value?.recentChats ?? [])
const recentChatOptions = computed(() => recentChats.value.map(chat => ({
  label: chat.title,
  value: chat.id,
  description: chat.activeDatasetId ? `Dataset ${chat.activeDatasetId.slice(0, 8)}…` : 'No active dataset'
})))

const messages = computed<ChatMessageSummary[]>(() => data.value?.context?.messages ?? [])
const toolCalls = computed<ToolCallSummary[]>(() => data.value?.context?.toolCalls ?? [])
const errors = computed(() => data.value?.context?.errors ?? [])
const generatedArtifacts = computed<ArtifactSummary[]>(() => data.value?.context?.generatedArtifacts ?? [])
const lastUserMessage = computed(() => data.value?.context?.lastUserMessagePreview ?? null)
const activeDataset = computed(() => data.value?.activeDataset ?? null)

const hasTrace = computed(() => Boolean(loadedChatId.value && data.value?.chatId))

function loadChat(value: string) {
  chatId.value = value
  loadedChatId.value = value
}

function clearChat() {
  chatId.value = ''
  loadedChatId.value = ''
}

function loadFromInput() {
  loadedChatId.value = chatId.value.trim()
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
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Trace
        </h2>
        <p class="text-sm text-muted">
          Lightweight view of a chat's tool calls, dataset, and generated artifacts.
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        label="Refresh"
        color="neutral"
        variant="ghost"
        :loading="pending"
        :disabled="!loadedChatId"
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

    <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
      <h3 class="text-sm font-semibold text-highlighted">
        Pick a chat
      </h3>

      <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
        <USelectMenu
          :model-value="recentChatOptions.find(o => o.value === loadedChatId)"
          :items="recentChatOptions"
          icon="i-lucide-message-square-text"
          placeholder="Recent chats"
          :search-input="{ placeholder: 'Search chats…' }"
          by="value"
          class="w-full"
          @update:model-value="(option) => option && loadChat(option.value)"
        />
        <UButton
          v-if="loadedChatId"
          icon="i-lucide-x"
          label="Clear"
          color="neutral"
          variant="ghost"
          @click="clearChat"
        />
      </div>

      <UAccordion
        :items="[{ label: 'Open by chat id', icon: 'i-lucide-hash', slot: 'lookup' }]"
      >
        <template #lookup>
          <div class="flex gap-2 px-1 py-2">
            <UInput
              v-model="chatId"
              placeholder="Chat id"
              class="flex-1"
              size="sm"
              @keyup.enter="loadFromInput"
            />
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-right"
              label="Load"
              :disabled="!chatId.trim()"
              @click="loadFromInput"
            />
          </div>
        </template>
      </UAccordion>
    </UCard>

    <!-- Placeholder when nothing selected -->
    <UCard
      v-if="!hasTrace"
      :ui="{ root: 'bg-default/60', body: 'space-y-3' }"
    >
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-route" class="mt-0.5 size-5 text-muted" />
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-highlighted">
            Lightweight trace view
          </h3>
          <p class="text-sm text-muted">
            Pick a recent chat above to see its active dataset, tool calls, and generated artifacts.
          </p>
          <p class="text-xs text-muted">
            A richer trace timeline (per workflow run, per task) requires execution-trace persistence and is not part of this MVP.
            For now this section uses chat message metadata and artifact links to reconstruct a coarse trace.
          </p>
        </div>
      </div>
    </UCard>

    <!-- Trace -->
    <div v-else class="grid gap-4 lg:grid-cols-2">
      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Chat
        </h3>
        <div class="rounded-md border border-default px-3 py-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Chat id
          </p>
          <p class="mt-1 truncate font-mono text-xs text-highlighted">
            {{ data?.chatId }}
          </p>
        </div>

        <div class="rounded-md border border-default px-3 py-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Latest user message
          </p>
          <p class="mt-1 text-sm text-highlighted">
            {{ lastUserMessage || '—' }}
          </p>
        </div>

        <div class="rounded-md border border-default px-3 py-2">
          <p class="text-xs uppercase tracking-wide text-muted">
            Active dataset
          </p>
          <p
            v-if="activeDataset"
            class="mt-1 text-sm text-highlighted"
          >
            {{ activeDataset.filename }}
            <span class="ml-1 font-mono text-xs text-muted">
              {{ activeDataset.id.slice(0, 8) }}…
            </span>
          </p>
          <p v-else class="mt-1 text-sm text-muted">
            No active dataset attached.
          </p>
        </div>
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Tool calls ({{ toolCalls.length }})
        </h3>

        <div v-if="toolCalls.length === 0" class="text-sm text-muted">
          No tool calls captured in this chat.
        </div>

        <ul v-else class="max-h-[20rem] divide-y divide-default overflow-auto">
          <li
            v-for="(call, idx) in toolCalls"
            :key="`${call.messageId}-${idx}`"
            class="flex items-center justify-between gap-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate font-mono text-xs text-highlighted">
                {{ call.toolName }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ call.type }} · {{ formatDate(call.createdAt) }}
              </p>
            </div>
          </li>
        </ul>
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Generated artifacts
        </h3>
        <div v-if="generatedArtifacts.length === 0" class="text-sm text-muted">
          No artifacts linked to this dataset.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="artifact in generatedArtifacts"
            :key="artifact.id"
            class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ artifact.title }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ artifact.type }} · {{ formatDate(artifact.createdAt) }}
              </p>
            </div>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-external-link"
              :to="`/artifacts/${artifact.id}`"
              target="_blank"
              aria-label="Open artifact"
            />
          </li>
        </ul>
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Errors ({{ errors.length }})
        </h3>
        <div v-if="errors.length === 0" class="text-sm text-muted">
          No error parts found in this chat.
        </div>
        <ul v-else class="space-y-1">
          <li
            v-for="(err, idx) in errors"
            :key="`${err.messageId}-${idx}`"
            class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm"
          >
            <span class="font-mono text-xs text-highlighted">{{ err.type }}</span>
            <span class="text-xs text-muted">{{ formatDate(err.createdAt) }}</span>
          </li>
        </ul>
      </UCard>

      <UCard :ui="{ root: 'lg:col-span-2 bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Message timeline ({{ messages.length }})
        </h3>
        <ol class="space-y-2">
          <li
            v-for="message in messages"
            :key="message.id"
            class="flex items-center gap-3 rounded-md border border-default px-3 py-2 text-sm"
          >
            <UBadge
              :color="message.role === 'user' ? 'primary' : message.role === 'assistant' ? 'neutral' : 'warning'"
              variant="soft"
            >
              {{ message.role }}
            </UBadge>
            <span class="flex-1 truncate text-xs text-muted">
              {{ message.partTypes.join(', ') || 'no parts' }}
            </span>
            <span class="text-xs text-muted">
              {{ formatDate(message.createdAt) }}
            </span>
          </li>
        </ol>
      </UCard>

      <DevtoolsJson
        title="Trace payload"
        :value="data"
        collapsed
      />
    </div>
  </div>
</template>
