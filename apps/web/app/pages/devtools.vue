<script setup lang="ts">
const route = useRoute()
const router = useRouter()

type DevtoolsOverviewResponse = {
  enabled: boolean
  environment: string
  counts: {
    tools: number
    workflows: number
    expectedNitroTasks: number
    datasets: number
    artifacts: number
  }
  health: {
    aiProvider: { configured: boolean, provider: string | null }
    githubOAuth: { configured: boolean }
  }
  recent: {
    datasets: Array<{ id: string, filename: string, uploadedAt: string, size: number, mimeType: string }>
    artifacts: Array<{ id: string, type: string, title: string, datasetId?: string, createdAt: string, updatedAt: string }>
    latestReportArtifact: { id: string, type: string, title: string, createdAt: string, updatedAt: string } | null
    latestDataset: { id: string, filename: string, uploadedAt: string, size: number, mimeType: string } | null
  }
}

const {
  data: overview,
  pending,
  error,
  refresh
} = await useFetch<DevtoolsOverviewResponse>('/api/devtools/overview')

const tabs = [
  { label: 'Overview', value: 'overview', icon: 'i-lucide-layout-dashboard', description: 'Health, recent activity, quick actions' },
  { label: 'Datasets', value: 'datasets', icon: 'i-lucide-database', description: 'Search, inspect, run workflows' },
  { label: 'Workflows', value: 'workflows', icon: 'i-lucide-git-branch', description: 'Run the Default Quality Gate' },
  { label: 'Tools', value: 'tools', icon: 'i-lucide-wrench', description: 'AI tools and Nitro task probes' },
  { label: 'Artifacts', value: 'artifacts', icon: 'i-lucide-file-text', description: 'Recent reports and lookups' },
  { label: 'Diagnostics', value: 'diagnostics', icon: 'i-lucide-activity', description: 'Environment and probes' },
  { label: 'Trace', value: 'trace', icon: 'i-lucide-route', description: 'Chat tool-call trace' },
  { label: 'Chat Context', value: 'chat', icon: 'i-lucide-message-square-text', description: 'Sanitized context (raw)' }
]

const initialTab = typeof route.query.tab === 'string' ? route.query.tab : 'overview'
const activeTab = ref(tabs.some(tab => tab.value === initialTab) ? initialTab : 'overview')

const initialDatasetId = computed(() => typeof route.query.datasetId === 'string' ? route.query.datasetId : '')
const initialArtifactId = computed(() => typeof route.query.artifactId === 'string' ? route.query.artifactId : '')
const initialChatId = computed(() => typeof route.query.chatId === 'string' ? route.query.chatId : '')

const activeItem = computed(() => tabs.find(tab => tab.value === activeTab.value) ?? tabs[0]!)

function navigateTab(tab: string, query: Record<string, string> = {}) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, ...query, tab } })
}
</script>

<template>
  <UDashboardPanel
    id="devtools"
    class="min-h-0"
  >
    <template #header>
      <Navbar>
        <template #title>
          <div class="min-w-0">
            <h1 class="truncate text-base font-semibold text-highlighted">
              Data Gate DevTools
            </h1>
            <p class="text-sm text-muted">
              Internal observability for tools, workflows, datasets, and artifacts.
            </p>
          </div>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="w-full max-w-none space-y-6 px-4 pb-6 pt-[calc(var(--ui-header-height)+1rem)] sm:px-6 lg:px-8">
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="DevTools unavailable"
          :description="error.message"
        />

        <div
          v-else
          class="space-y-6"
        >
          <div class="flex flex-col gap-4 rounded-lg border border-default bg-elevated/40 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="soft">
                  {{ overview?.environment || 'Local' }}
                </UBadge>
                <UBadge color="success" variant="soft">
                  Safe metadata only
                </UBadge>
              </div>
              <h2 class="mt-3 text-2xl font-semibold tracking-tight text-highlighted">
                {{ activeItem.label }}
              </h2>
              <p class="mt-1 max-w-3xl text-sm text-muted">
                {{ activeItem.description }}. Secrets, raw rows, and storage paths stay hidden.
              </p>
            </div>

            <UButton
              icon="i-lucide-refresh-cw"
              label="Refresh"
              color="neutral"
              variant="outline"
              :loading="pending"
              @click="() => refresh()"
            />
          </div>

          <div class="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
            <aside class="xl:sticky xl:top-6 xl:self-start">
              <div class="grid gap-2 rounded-lg border border-default bg-default/60 p-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-1">
                <button
                  v-for="tab in tabs"
                  :key="tab.value"
                  type="button"
                  class="group flex min-w-0 items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-elevated"
                  :class="activeTab === tab.value ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted'"
                  @click="navigateTab(tab.value)"
                >
                  <UIcon
                    :name="tab.icon"
                    class="mt-0.5 size-4 shrink-0"
                  />
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium text-highlighted group-hover:text-highlighted">
                      {{ tab.label }}
                    </span>
                    <span class="mt-0.5 hidden text-xs text-muted xl:block">
                      {{ tab.description }}
                    </span>
                  </span>
                </button>
              </div>
            </aside>

            <main class="min-w-0">
              <DevtoolsOverview
                v-if="activeTab === 'overview'"
                :overview="overview"
                @navigate="navigateTab"
              />
              <DevtoolsDatasets
                v-else-if="activeTab === 'datasets'"
                :initial-dataset-id="initialDatasetId"
              />
              <DevtoolsWorkflows
                v-else-if="activeTab === 'workflows'"
                :initial-dataset-id="initialDatasetId"
              />
              <DevtoolsTools v-else-if="activeTab === 'tools'" />
              <DevtoolsArtifacts
                v-else-if="activeTab === 'artifacts'"
                :initial-artifact-id="initialArtifactId"
              />
              <DevtoolsDiagnostics v-else-if="activeTab === 'diagnostics'" />
              <DevtoolsTrace
                v-else-if="activeTab === 'trace'"
                :initial-chat-id="initialChatId"
              />
              <DevtoolsChatAgentContext
                v-else-if="activeTab === 'chat'"
                :initial-chat-id="initialChatId"
              />
            </main>
          </div>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
