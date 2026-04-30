// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@comark/nuxt',
    '@nuxthub/core',
    'nuxt-auth-utils',
    'nuxt-csurf'
  ],

  devtools: {
    enabled: false
  },

  css: ['~/assets/css/main.css'],

  ui: {
    content: false,
    experimental: {
      componentDetection: true
    }
  },

  experimental: {
    viewTransition: true
  },

  compatibilityDate: 'latest',

  runtimeConfig: {
    aiProvider: process.env.AI_PROVIDER || '',
    aiModel: process.env.AI_MODEL || '',
    googleGenerativeAiApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY || '',
    public: {
      aiProvider: process.env.AI_PROVIDER || '',
      aiModel: process.env.AI_MODEL || '',
      hasGoogleAiProvider: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      hasGatewayAiProvider: !!process.env.AI_GATEWAY_API_KEY
    }
  },

  nitro: {
    experimental: {
      openAPI: true
    }
  },

  hub: {
    db: 'sqlite'
  },

  vite: {
    optimizeDeps: {
      include: ['striptags']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
