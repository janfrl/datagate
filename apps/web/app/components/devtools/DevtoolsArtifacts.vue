<script setup lang="ts">
const artifactId = ref('')
const pending = ref(false)
type DevtoolsArtifactResponse = {
  metadata: Record<string, unknown>
  report: {
    content?: string
  } | null
}

const artifact = ref<DevtoolsArtifactResponse>()
const errorMessage = ref('')

async function fetchArtifact() {
  pending.value = true
  artifact.value = undefined
  errorMessage.value = ''

  try {
    artifact.value = await $fetch<DevtoolsArtifactResponse>(`/api/devtools/artifacts/${artifactId.value}`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    pending.value = false
  }
}

const reportContent = computed(() => {
  return artifact.value?.report?.content || ''
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold text-highlighted">
        Artifacts
      </h2>
      <p class="text-sm text-muted">
        Fetches an artifact by id. Report Markdown is sanitized before display.
      </p>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="artifactId"
        icon="i-lucide-file-text"
        placeholder="Artifact id"
        class="flex-1"
      />
      <UButton
        icon="i-lucide-search"
        label="Fetch"
        color="neutral"
        :loading="pending"
        :disabled="!artifactId"
        @click="fetchArtifact"
      />
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
    />

    <div
      v-if="artifact"
      class="grid gap-4 lg:grid-cols-2"
    >
      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Metadata
        </h3>
        <DevtoolsJson :value="artifact?.metadata" />
      </UCard>

      <UCard :ui="{ root: 'bg-default/60', body: 'space-y-3' }">
        <h3 class="text-sm font-semibold text-highlighted">
          Raw response
        </h3>
        <DevtoolsJson
          title="Artifact response"
          :value="artifact"
          collapsed
        />
      </UCard>
    </div>

    <UCard
      v-if="reportContent"
      :ui="{ root: 'bg-default/60', body: 'space-y-3' }"
    >
      <h3 class="text-sm font-semibold text-highlighted">
        Report Markdown
      </h3>
      <pre class="max-h-[36rem] overflow-auto whitespace-pre-wrap rounded-md bg-elevated p-3 text-sm leading-6 text-highlighted">{{ reportContent }}</pre>
    </UCard>
  </div>
</template>
