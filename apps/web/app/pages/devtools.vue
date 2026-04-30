<script setup lang="ts">
const route = useRoute()

const {
  data: overview,
  pending,
  error,
  refresh
} = await useFetch('/api/devtools/overview')

const activeTab = ref('overview')
const tabs = [
  { label: 'Overview', value: 'overview', icon: 'i-lucide-layout-dashboard', description: 'Runtime summary and guardrails' },
  { label: 'Chat Context', value: 'chat', icon: 'i-lucide-message-square-text', description: 'Sanitized agent context' },
  { label: 'Tools', value: 'tools', icon: 'i-lucide-wrench', description: 'AI tools and task contracts' },
  { label: 'Workflows', value: 'workflows', icon: 'i-lucide-git-branch', description: 'Built-in flow execution' },
  { label: 'Datasets', value: 'datasets', icon: 'i-lucide-table', description: 'Uploaded dataset metadata' },
  { label: 'Artifacts', value: 'artifacts', icon: 'i-lucide-file-text', description: 'Report artifact lookup' },
  { label: 'Diagnostics', value: 'diagnostics', icon: 'i-lucide-activity', description: 'Config and task probes' }
]

const activeItem = computed(() => tabs.find(tab => tab.value === activeTab.value) ?? {
  label: 'Overview',
  value: 'overview',
  icon: 'i-lucide-layout-dashboard',
  description: 'Runtime summary and guardrails'
})
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
              Internal development observability for tools, workflows, datasets, and artifacts.
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
                  Local development
                </UBadge>
                <UBadge color="success" variant="soft">
                  Safe metadata only
                </UBadge>
              </div>
              <h2 class="mt-3 text-2xl font-semibold tracking-tight text-highlighted">
                {{ activeItem.label }}
              </h2>
              <p class="mt-1 max-w-3xl text-sm text-muted">
                {{ activeItem.description }}. Secrets, raw rows, and local storage paths stay hidden by default.
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
                  @click="activeTab = tab.value"
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
              />
              <DevtoolsChatAgentContext
                v-else-if="activeTab === 'chat'"
                :initial-chat-id="typeof route.query.chatId === 'string' ? route.query.chatId : ''"
              />
              <DevtoolsTools v-else-if="activeTab === 'tools'" />
              <DevtoolsWorkflows v-else-if="activeTab === 'workflows'" />
              <DevtoolsDatasets v-else-if="activeTab === 'datasets'" />
              <DevtoolsArtifacts v-else-if="activeTab === 'artifacts'" />
              <DevtoolsDiagnostics v-else-if="activeTab === 'diagnostics'" />
            </main>
          </div>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
