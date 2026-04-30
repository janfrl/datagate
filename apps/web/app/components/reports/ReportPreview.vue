<script setup lang="ts">
import type { Artifact } from '@datagate/shared'

const props = defineProps<{
  artifact?: Artifact | null
  pending?: boolean
}>()

const markdown = computed(() => typeof props.artifact?.content === 'string' ? props.artifact.content : '')
</script>

<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-highlighted">
          {{ artifact?.title || 'Report artifact' }}
        </h1>
        <p
          v-if="artifact"
          class="mt-1 text-sm text-muted"
        >
          Artifact {{ artifact.id }}
        </p>
      </div>

      <UBadge
        v-if="artifact"
        color="neutral"
        variant="soft"
        class="self-start"
      >
        {{ artifact.type }}
      </UBadge>
    </div>

    <div
      v-if="pending"
      class="flex items-center gap-2 text-sm text-muted"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-4 animate-spin"
      />
      Loading report...
    </div>

    <ChatComark
      v-else-if="markdown"
      :markdown="markdown"
      class="max-w-none text-sm leading-6"
    />

    <pre
      v-else-if="artifact"
      class="overflow-auto rounded-md bg-elevated p-4 text-sm whitespace-pre-wrap"
    >
      {{ JSON.stringify(artifact.content, null, 2) }}
    </pre>

    <p v-else class="text-sm text-muted">
      Report artifact not found.
    </p>
  </UCard>
</template>
