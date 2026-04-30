import { listArtifacts } from '../../services/artifacts/artifactStore'
import { toPublicDataset } from '../../services/datasets/datasetResponses'
import { listDatasets } from '../../services/datasets/storage'
import { devtoolsBuiltInWorkflows, devtoolsExpectedNitroTasks, devtoolsHighLevelTools } from '../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled, isDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

const recentDatasetLimit = 5
const recentArtifactLimit = 5

export default defineEventHandler(async () => {
  assertDataGateDevtoolsEnabled()

  const config = useRuntimeConfig()
  const hasGoogle = hasValue(config.googleGenerativeAiApiKey)
  const hasGateway = hasValue(config.aiGatewayApiKey)
  const aiConfigured = hasGoogle || hasGateway
  const githubOAuthConfigured = hasValue(process.env.NUXT_OAUTH_GITHUB_CLIENT_ID)
    && hasValue(process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET)

  const [datasets, artifacts] = await Promise.all([
    safeList(() => listDatasets()),
    safeList(() => listArtifacts())
  ])

  const recentDatasets = datasets.slice(0, recentDatasetLimit).map(toPublicDataset)
  const recentArtifacts = artifacts.slice(0, recentArtifactLimit).map(artifact => ({
    id: artifact.id,
    type: artifact.type,
    title: artifact.title,
    datasetId: artifact.datasetId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt
  }))
  const latestReportArtifact = recentArtifacts.find(artifact => artifact.type === 'report') ?? null
  const latestDataset = recentDatasets[0] ?? null

  return {
    enabled: isDataGateDevtoolsEnabled(),
    environment: process.env.NODE_ENV || 'development',
    counts: {
      tools: devtoolsHighLevelTools.length,
      workflows: devtoolsBuiltInWorkflows.length,
      expectedNitroTasks: devtoolsExpectedNitroTasks.length,
      datasets: datasets.length,
      artifacts: artifacts.length
    },
    health: {
      aiProvider: {
        configured: aiConfigured,
        provider: aiConfigured ? (hasGoogle ? 'google' : 'gateway') : null
      },
      githubOAuth: {
        configured: githubOAuthConfigured
      }
    },
    recent: {
      datasets: recentDatasets,
      artifacts: recentArtifacts,
      latestReportArtifact,
      latestDataset
    },
    privacy: {
      rawDatasetRowsExposed: false,
      storagePathsExposedByDefault: false,
      secretsExposed: false
    }
  }
})

async function safeList<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}

function hasValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}
