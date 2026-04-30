import { fileURLToPath } from 'node:url'

const taskHandler = (path: string) => fileURLToPath(new URL(path, import.meta.url))

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
    prose: false,
    content: false,
    experimental: {
      componentDetection: true
    }
  },

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

  experimental: {
    viewTransition: true
  },

  compatibilityDate: 'latest',

  nitro: {
    experimental: {
      openAPI: true,
      tasks: true
    },
    tasks: {
      'datagate:profile:schema': {
        handler: taskHandler('./server/tasks/datagate.profile.schema.ts'),
        description: 'Detects schema issues in a dataset profile.'
      },
      'datagate:profile:completeness': {
        handler: taskHandler('./server/tasks/datagate.profile.completeness.ts'),
        description: 'Detects missing-value issues in a dataset profile.'
      },
      'datagate:profile:pii': {
        handler: taskHandler('./server/tasks/datagate.profile.pii.ts'),
        description: 'Detects deterministic PII signals in a dataset profile.'
      },
      'datagate:profile:outliers': {
        handler: taskHandler('./server/tasks/datagate.profile.outliers.ts'),
        description: 'Detects numeric outliers using IQR bounds.'
      }
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
