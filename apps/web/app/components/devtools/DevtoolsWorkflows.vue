<script setup lang="ts">
const { csrf, headerName } = useCsrf()

type DevtoolsWorkflowsResponse = {
  workflows: Array<{
    id: string
    title: string
    description: string
    taskIds: string[]
  }>
}

const { data, pending, error, refresh } = await useFetch<DevtoolsWorkflowsResponse>('/api/devtools/workflows')

const datasetId = ref('')
const runPending = ref(false)
const runResult = ref<unknown>()

async function runWorkflow() {
  runPending.value = true
  runResult.value = undefined

  try {
    runResult.value = await $fetch('/api/devtools/workflows/run', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: {
        workflowId: 'default-quality-gate',
        datasetId: datasetId.value
      }
    })
  } catch (error) {
    runResult.value = {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    runPending.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">
          Workflows
        </h2>
        <p class="text-sm text-muted">
          Inspect task order and run deterministic workflows against uploaded datasets.
        </p>
      </div>
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

    <div
      v-for="workflow in data?.workflows || []"
      :key="workflow.id"
      class="rounded-lg border border-default bg-default/60 p-4"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="font-medium text-highlighted">
            {{ workflow.title }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ workflow.description }}
          </p>
        </div>
        <UBadge color="neutral" variant="soft">
          {{ workflow.id }}
        </UBadge>
      </div>

      <ol class="mt-4 grid gap-2 lg:grid-cols-2">
        <li
          v-for="(taskId, index) in workflow.taskIds"
          :key="taskId"
          class="flex items-center gap-3 rounded-md border border-default bg-elevated/50 px-3 py-2 text-sm"
        >
          <UBadge color="neutral" variant="outline">
            {{ index + 1 }}
          </UBadge>
          <span class="font-mono text-xs text-highlighted">{{ taskId }}</span>
        </li>
      </ol>
    </div>

    <UCard :ui="{ root: 'bg-default/60', body: 'space-y-4' }">
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          Run Default Quality Gate
        </h3>
        <p class="text-sm text-muted">
          Runs the real workflow and returns the raw workflow result or exact error.
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row">
        <UInput
          v-model="datasetId"
          icon="i-lucide-database"
          placeholder="Dataset id"
          class="flex-1"
        />
        <UButton
          icon="i-lucide-play"
          label="Run"
          color="neutral"
          :loading="runPending"
          :disabled="!datasetId"
          @click="runWorkflow"
        />
      </div>

      <DevtoolsJson
        v-if="runResult"
        title="Workflow response"
        :value="runResult"
      />
    </UCard>
  </div>
</template>
