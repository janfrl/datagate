import { gateway } from '@ai-sdk/gateway'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { defaultGatewayModel, defaultGoogleModel, isChatModelForProvider, isChatProvider, type ChatProvider } from '#shared/utils/models'

type ChatProviderRequest = {
  provider?: string
  model?: string
}

type ChatModelConfig = {
  model: ReturnType<typeof gateway>
  modelId: string
  provider: ChatProvider
}

function chatConfigError(message: string) {
  return createError({
    statusCode: 503,
    statusMessage: message,
    message
  })
}

function valueFromConfig(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function providerFromConfig(value: unknown): ChatProvider | undefined {
  const provider = valueFromConfig(value)

  if (isChatProvider(provider)) {
    return provider
  }

  return undefined
}

function configuredProvider(requestedProvider: string | undefined, config: ReturnType<typeof useRuntimeConfig>) {
  const provider = providerFromConfig(requestedProvider) || providerFromConfig(config.aiProvider)

  if (provider) return provider

  if (valueFromConfig(config.googleGenerativeAiApiKey)) return 'google'
  if (valueFromConfig(config.aiGatewayApiKey)) return 'gateway'
}

function selectedModel(provider: ChatProvider, requestedModel: string | undefined, configuredModel: unknown) {
  const requested = valueFromConfig(requestedModel)

  if (requested) {
    if (!isChatModelForProvider(provider, requested)) {
      throw chatConfigError(`The selected model is not supported for ${provider}. Choose one of the configured model options.`)
    }

    return requested
  }

  const configured = valueFromConfig(configuredModel)
  if (configured && isChatModelForProvider(provider, configured)) {
    return configured
  }

  return provider === 'google' ? defaultGoogleModel : defaultGatewayModel
}

export function getChatModelConfig(request: ChatProviderRequest = {}): ChatModelConfig {
  const config = useRuntimeConfig()
  const provider = configuredProvider(request.provider, config)

  if (!provider) {
    throw chatConfigError('AI chat provider is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY, AI_GATEWAY_API_KEY, or both. Dataset upload, workflows, and reports still work without an AI key.')
  }

  if (provider === 'google') {
    const apiKey = valueFromConfig(config.googleGenerativeAiApiKey)

    if (!apiKey) {
      throw chatConfigError('Google AI chat is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY, or unset AI_PROVIDER to run deterministic Data Gate flows without chat.')
    }

    const google = createGoogleGenerativeAI({ apiKey })
    const model = selectedModel(provider, request.model, config.aiModel)

    return {
      model: google(model),
      modelId: model,
      provider
    }
  }

  const apiKey = valueFromConfig(config.aiGatewayApiKey)

  if (!apiKey) {
    throw chatConfigError('Vercel AI Gateway chat is not configured. Set AI_GATEWAY_API_KEY, or unset AI_PROVIDER to run deterministic Data Gate flows without chat.')
  }

  const model = selectedModel(provider, request.model, config.aiModel)

  return {
    model: gateway(model),
    modelId: model,
    provider
  }
}

export function getChatLanguageModel(request: ChatProviderRequest = {}) {
  return getChatModelConfig(request).model
}
