import { CHAT_MODELS, CHAT_PROVIDERS, defaultGatewayModel, defaultGoogleModel, isChatProvider, type ChatProvider } from '#shared/utils/models'

export function useModels() {
  const config = useRuntimeConfig()
  const availableProviders = computed(() => CHAT_PROVIDERS.filter((provider) => {
    if (provider.value === 'google') return config.public.hasGoogleAiProvider
    if (provider.value === 'gateway') return config.public.hasGatewayAiProvider

    return false
  }))

  const configuredProvider = isChatProvider(config.public.aiProvider) ? config.public.aiProvider : undefined
  const provider = useCookie<ChatProvider>('chat-provider', {
    default: () => configuredProvider || availableProviders.value[0]?.value || 'google'
  })

  watchEffect(() => {
    const isAvailable = availableProviders.value.some(option => option.value === provider.value)
    if (!isAvailable && availableProviders.value[0]) {
      provider.value = availableProviders.value[0].value
    }
  })

  const models = computed(() => CHAT_MODELS.filter(model => model.provider === provider.value))
  const model = useCookie<string>('chat-model', {
    default: () => defaultModelForProvider(provider.value, config.public.aiModel)
  })

  watchEffect(() => {
    const isAvailable = models.value.some(option => option.value === model.value)
    if (!isAvailable) {
      model.value = defaultModelForProvider(provider.value, config.public.aiModel)
    }
  })

  const providerIcon = computed(() => CHAT_PROVIDERS.find(option => option.value === provider.value)?.icon)
  const modelIcon = computed(() => models.value.find(option => option.value === model.value)?.icon)

  return {
    availableProviders,
    model,
    modelIcon,
    models,
    provider,
    providerIcon
  }
}

function defaultModelForProvider(provider: ChatProvider, configuredModel: string) {
  if (CHAT_MODELS.some(model => model.provider === provider && model.value === configuredModel)) {
    return configuredModel
  }

  return provider === 'google' ? defaultGoogleModel : defaultGatewayModel
}
