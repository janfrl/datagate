<script setup lang="ts">
const { availableProviders, model, modelIcon, models, provider, providerIcon } = useModels()
</script>

<template>
  <div class="flex items-center gap-1">
    <USelectMenu
      v-model="provider"
      :items="availableProviders"
      :disabled="availableProviders.length <= 1"
      :icon="providerIcon"
      size="sm"
      variant="ghost"
      value-key="value"
      class="w-36 data-[state=open]:bg-elevated"
    />

    <USelectMenu
      v-model="model"
      :items="models"
      :icon="modelIcon"
      size="sm"
      variant="ghost"
      value-key="value"
      class="w-56 data-[state=open]:bg-elevated"
    />
  </div>
</template>
