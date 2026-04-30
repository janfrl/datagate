<script setup lang="ts">
type DevtoolsArtifactSummary = {
  id: string
  type: string
  title: string
  datasetId?: string
  createdAt: string
  updatedAt: string
}

type DevtoolsDatasetSummary = {
  id: string
  filename: string
  uploadedAt: string
  size: number
  mimeType: string
}

type DevtoolsOverview = {
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
    datasets: DevtoolsDatasetSummary[]
    artifacts: DevtoolsArtifactSummary[]
    latestReportArtifact: DevtoolsArtifactSummary | null
    latestDataset: DevtoolsDatasetSummary | null
  }
}

const props = defineProps<{
  overview?: DevtoolsOverview | null
}>()

const emit = defineEmits<{
  navigate: [tab: string, query?: Record<string, string>]
}>()

const aiHealth = computed(() => props.overview?.health?.aiProvider?.configured ? 'configured' : 'missing')
const githubHealth = computed(() => props.overview?.health?.githubOAuth?.configured ? 'configured' : 'missing')

const environmentLabel = computed(() => {
  const env = props.overview?.environment
  if (!env) return 'Unknown'
  return `${env.charAt(0).toUpperCase()}${env.slice(1)}`
})

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatBytes(value: number) {
  const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${formatter.format(value / 1024)} KB`
  return `${formatter.format(value / (1024 * 1024))} MB`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Quick metrics -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div
        v-for="metric in [{
          label: 'Datasets',
          value: overview?.counts?.datasets ?? 0,
          icon: 'i-lucide-database'
        }, {
          label: 'Workflows',
          value: overview?.counts?.workflows ?? 0,
          icon: 'i-lucide-git-branch'
        }, {
          label: 'Expected tasks',
          value: overview?.counts?.expectedNitroTasks ?? 0,
          icon: 'i-lucide-list-checks'
        }, {
          label: 'Tools',
          value: overview?.counts?.tools ?? 0,
          icon: 'i-lucide-wrench'
        }, {
          label: 'Artifacts',
          value: overview?.counts?.artifacts ?? 0,
          icon: 'i-lucide-file-text'
        }]"
        :key="metric.label"
        class="rounded-lg border border-default bg-default/60 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-muted">
            {{ metric.label }}
          </p>
          <UIcon
            :name="metric.icon"
            class="size-4 text-muted"
          />
        </div>
        <p class="mt-3 truncate text-3xl font-semibold tracking-tight text-highlighted">
          {{ metric.value }}
        </p>
      </div>
    </div>

    <!-- System health + Quick actions -->
    <div class="grid gap-4 lg:grid-cols-3">
      <UCard
        :ui="{ root: 'lg:col-span-2 bg-default/60', body: 'space-y-4' }"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-highlighted">
            System health
          </h3>
          <UBadge color="neutral" variant="outline">
            {{ environmentLabel }}
          </UBadge>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="flex items-start justify-between gap-3 rounded-md border border-default px-3 py-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                AI provider
              </p>
              <p class="mt-0.5 text-xs text-muted">
                {{ overview?.health?.aiProvider?.provider || 'No provider selected' }}
              </p>
            </div>
            <DevtoolsStatusBadge :status="aiHealth" />
          </div>

          <div class="flex items-start justify-between gap-3 rounded-md border border-default px-3 py-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                GitHub OAuth
              </p>
              <p class="mt-0.5 text-xs text-muted">
                Used for chat sign-in.
              </p>
            </div>
            <DevtoolsStatusBadge :status="githubHealth" />
          </div>

          <div class="flex items-start justify-between gap-3 rounded-md border border-default px-3 py-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                Latest dataset
              </p>
              <p class="mt-0.5 truncate text-xs text-muted">
                {{ overview?.recent?.latestDataset?.filename || 'No datasets yet' }}
              </p>
            </div>
            <DevtoolsStatusBadge
              :status="overview?.recent?.latestDataset ? 'healthy' : 'missing'"
              :label="overview?.recent?.latestDataset ? 'Ready' : 'None'"
            />
          </div>

          <div class="flex items-start justify-between gap-3 rounded-md border border-default px-3 py-3">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                Latest report
              </p>
              <p class="mt-0.5 truncate text-xs text-muted">
                {{ overview?.recent?.latestReportArtifact?.title || 'No reports generated yet' }}
              </p>
            </div>
            <DevtoolsStatusBadge
              :status="overview?.recent?.latestReportArtifact ? 'healthy' : 'not-tested'"
              :label="overview?.recent?.latestReportArtifact ? 'Available' : 'None'"
            />
          </div>
        </div>
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Quick actions
        </h3>

        <div class="grid gap-2">
          <UButton
            block
            color="neutral"
            variant="outline"
            icon="i-lucide-database"
            label="Open latest dataset"
            :disabled="!overview?.recent?.latestDataset"
            @click="emit('navigate', 'datasets', overview?.recent?.latestDataset ? { datasetId: overview.recent.latestDataset.id } : {})"
          />
          <UButton
            block
            color="primary"
            icon="i-lucide-shield-check"
            label="Run Default Quality Gate"
            :disabled="!overview?.recent?.latestDataset"
            @click="emit('navigate', 'workflows', overview?.recent?.latestDataset ? { datasetId: overview.recent.latestDataset.id } : {})"
          />
          <UButton
            block
            color="neutral"
            variant="outline"
            icon="i-lucide-activity"
            label="Probe expected tasks"
            @click="emit('navigate', 'tools')"
          />
          <UButton
            block
            color="neutral"
            variant="outline"
            icon="i-lucide-file-text"
            label="Open latest report"
            :disabled="!overview?.recent?.latestReportArtifact"
            :to="overview?.recent?.latestReportArtifact ? `/artifacts/${overview.recent.latestReportArtifact.id}` : undefined"
          />
        </div>
      </UCard>
    </div>

    <!-- Recent activity -->
    <div class="grid gap-4 lg:grid-cols-2">
      <UCard :ui="{ root: 'bg-default/60', body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between border-b border-default px-4 py-3">
          <h3 class="text-sm font-semibold text-highlighted">
            Recent datasets
          </h3>
          <UButton
            label="Open all"
            color="neutral"
            variant="ghost"
            size="xs"
            trailing-icon="i-lucide-arrow-right"
            @click="emit('navigate', 'datasets')"
          />
        </div>

        <ul
          v-if="overview?.recent?.datasets?.length"
          class="divide-y divide-default"
        >
          <li
            v-for="dataset in overview.recent.datasets"
            :key="dataset.id"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ dataset.filename }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ formatDate(dataset.uploadedAt) }} · {{ formatBytes(dataset.size) }}
              </p>
            </div>
            <UButton
              icon="i-lucide-arrow-right"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Inspect dataset"
              @click="emit('navigate', 'datasets', { datasetId: dataset.id })"
            />
          </li>
        </ul>
        <div
          v-else
          class="px-4 py-6 text-sm text-muted"
        >
          No datasets uploaded yet.
        </div>
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between border-b border-default px-4 py-3">
          <h3 class="text-sm font-semibold text-highlighted">
            Recent artifacts
          </h3>
          <UButton
            label="Open all"
            color="neutral"
            variant="ghost"
            size="xs"
            trailing-icon="i-lucide-arrow-right"
            @click="emit('navigate', 'artifacts')"
          />
        </div>

        <ul
          v-if="overview?.recent?.artifacts?.length"
          class="divide-y divide-default"
        >
          <li
            v-for="artifact in overview.recent.artifacts"
            :key="artifact.id"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ artifact.title }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ artifact.type }} · {{ formatDate(artifact.updatedAt) }}
              </p>
            </div>
            <UButton
              icon="i-lucide-eye"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Open artifact"
              @click="emit('navigate', 'artifacts', { artifactId: artifact.id })"
            />
          </li>
        </ul>
        <div
          v-else
          class="px-4 py-6 text-sm text-muted"
        >
          No report artifacts generated yet. Run the Default Quality Gate.
        </div>
      </UCard>
    </div>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-lock"
      title="Privacy guardrails"
      description="DevTools endpoints return metadata, schemas, summaries, result shapes, and sanitized report content. They do not expose raw rows, secrets, or local storage paths."
    />

    <DevtoolsJson
      title="Overview payload"
      :value="overview"
      collapsed
    />
  </div>
</template>
