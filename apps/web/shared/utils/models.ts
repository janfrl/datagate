export type ChatProvider = 'google' | 'gateway'

export type ChatModelOption = {
  label: string
  value: string
  provider: ChatProvider
  icon: string
}

export const defaultGoogleModel = 'gemini-2.5-flash-lite'
export const defaultGatewayModel = 'google/gemini-2.5-flash-lite'

export const CHAT_PROVIDERS = [
  { label: 'Google Gemini', value: 'google', icon: 'i-simple-icons-google' },
  { label: 'Vercel Gateway', value: 'gateway', icon: 'i-lucide-waypoints' }
] satisfies Array<{ label: string, value: ChatProvider, icon: string }>

export const CHAT_MODELS = [
  {
    label: 'Gemini 2.5 Flash Lite',
    value: 'gemini-2.5-flash-lite',
    provider: 'google',
    icon: 'i-simple-icons-google'
  },
  {
    label: 'Gemini 2.5 Flash',
    value: 'gemini-2.5-flash',
    provider: 'google',
    icon: 'i-simple-icons-google'
  },
  {
    label: 'Gemini 3 Flash Preview',
    value: 'gemini-3-flash-preview',
    provider: 'google',
    icon: 'i-simple-icons-google'
  },
  {
    label: 'Gemini 2.0 Flash Lite',
    value: 'gemini-2.0-flash-lite',
    provider: 'google',
    icon: 'i-simple-icons-google'
  },
  {
    label: 'Gemini 2.5 Flash Lite',
    value: 'google/gemini-2.5-flash-lite',
    provider: 'gateway',
    icon: 'i-simple-icons-google'
  },
  {
    label: 'Gemini 2.5 Flash',
    value: 'google/gemini-2.5-flash',
    provider: 'gateway',
    icon: 'i-simple-icons-google'
  },
  {
    label: 'Gemini 3 Flash Preview',
    value: 'google/gemini-3-flash-preview',
    provider: 'gateway',
    icon: 'i-simple-icons-google'
  },
  {
    label: 'Gemini 2.0 Flash Lite',
    value: 'google/gemini-2.0-flash-lite',
    provider: 'gateway',
    icon: 'i-simple-icons-google'
  }
] satisfies ChatModelOption[]

export function isChatProvider(value: string): value is ChatProvider {
  return CHAT_PROVIDERS.some(provider => provider.value === value)
}

export function isChatModelForProvider(provider: ChatProvider, model: string) {
  return CHAT_MODELS.some(option => option.provider === provider && option.value === model)
}
