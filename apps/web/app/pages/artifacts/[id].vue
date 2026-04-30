<script setup lang="ts">
import type { Artifact } from '@datagate/shared'

const route = useRoute()
const artifactId = computed(() => String(route.params.id))

const {
  data: artifact,
  pending,
  error
} = await useFetch<Artifact>(() => `/api/artifacts/${artifactId.value}`)
</script>

<template>
  <UDashboardPanel
    id="artifact"
    class="min-h-0"
  >
    <template #header>
      <Navbar>
        <template #title>
          <div class="min-w-0">
            <h1 class="truncate text-base font-semibold text-highlighted">
              Report
            </h1>
            <p class="truncate text-sm text-muted">
              {{ artifactId }}
            </p>
          </div>
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="w-full space-y-4 py-6">
        <UButton
          icon="i-lucide-arrow-left"
          label="Back to datasets"
          color="neutral"
          variant="ghost"
          to="/datasets"
          class="self-start"
        />

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Unable to load artifact"
          :description="error.message"
        />

        <ReportPreview
          v-else
          :artifact="artifact"
          :pending="pending"
        />
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
