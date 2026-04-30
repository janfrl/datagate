import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { defaultGatewayModel, defaultGoogleModel } from '#shared/utils/models'
import { artifactsDir } from '../../services/artifacts/artifactStore'
import { dataRoot, datasetsDir, profilesDir, uploadsDir } from '../../services/datasets/storage'
import { createTaskResultShape, devtoolsExpectedNitroTasks } from '../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

export default defineEventHandler(async (event) => {
  assertDataGateDevtoolsEnabled()

  const query = await getValidatedQuery(event, z.object({
    datasetId: z.string().uuid().optional()
  }).parse)
  const config = useRuntimeConfig()
  const hasGoogle = hasValue(config.googleGenerativeAiApiKey)
  const hasGateway = hasValue(config.aiGatewayApiKey)
  const configuredProvider = stringValue(config.aiProvider)
  const selectedProvider = configuredProvider || (hasGoogle ? 'google' : hasGateway ? 'gateway' : '')
  const configuredModel = stringValue(config.aiModel)

  return {
    ai: {
      configured: hasGoogle || hasGateway,
      providers: {
        google: hasGoogle,
        gateway: hasGateway
      },
      selectedProvider: selectedProvider || null,
      selectedModel: configuredModel || defaultModelForProvider(selectedProvider)
    },
    githubOAuth: {
      configured: hasValue(process.env.NUXT_OAUTH_GITHUB_CLIENT_ID) && hasValue(process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET)
    },
    localDataDirectories: await Promise.all([
      directoryStatus('dataRoot', dataRoot),
      directoryStatus('uploads', uploadsDir),
      directoryStatus('datasets', datasetsDir),
      directoryStatus('profiles', profilesDir),
      directoryStatus('artifacts', artifactsDir)
    ]),
    requiredEndpoints: await Promise.all([
      endpointFileStatus('/api/datasets', 'server/api/datasets/index.get.ts'),
      endpointFileStatus('/api/datasets/[id]/workflows/default-quality-gate/run', 'server/api/datasets/[id]/workflows/default-quality-gate/run.post.ts'),
      endpointFileStatus('/api/artifacts/[id]', 'server/api/artifacts/[id].get.ts'),
      endpointFileStatus('/api/chats/[id]', 'server/api/chats/[id].post.ts')
    ]),
    expectedNitroTasks: query.datasetId
      ? await probeTasks(query.datasetId)
      : devtoolsExpectedNitroTasks.map(task => ({
          taskName: task.name,
          sourceFile: task.sourceFile,
          ok: null,
          status: 'probe-required',
          message: 'Add a dataset id to run an availability probe.'
        }))
  }
})

async function probeTasks(datasetId: string) {
  const checks = []

  for (const task of devtoolsExpectedNitroTasks) {
    const sourceFilePresent = await pathExists(join(process.cwd(), task.sourceFile))

    try {
      const result = await runTask(task.name, { payload: { datasetId } })

      checks.push({
        taskName: task.name,
        sourceFile: task.sourceFile,
        sourceFilePresent,
        ok: true,
        status: 'runnable',
        resultShape: createTaskResultShape(result)
      })
    } catch (error) {
      checks.push({
        taskName: task.name,
        sourceFile: task.sourceFile,
        sourceFilePresent,
        ok: false,
        status: 'failed',
        message: sourceFilePresent
          ? 'Task source file exists, but Nitro runTask did not run it in this server process.'
          : 'Expected task source file is missing.',
        error: createDiagnosticsError(error)
      })
    }
  }

  return checks
}

async function directoryStatus(name: string, path: string) {
  return {
    name,
    exists: await pathExists(path)
  }
}

async function endpointFileStatus(route: string, file: string) {
  return {
    route,
    reachable: await pathExists(join(process.cwd(), file)),
    check: 'server-file'
  }
}

async function pathExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function createDiagnosticsError(error: unknown) {
  if (error && typeof error === 'object') {
    const details = error as {
      message?: unknown
      statusMessage?: unknown
      statusCode?: unknown
    }

    return {
      message: typeof details.message === 'string'
        ? details.message
        : typeof details.statusMessage === 'string' ? details.statusMessage : 'Task probe failed',
      statusMessage: typeof details.statusMessage === 'string' ? details.statusMessage : undefined,
      statusCode: typeof details.statusCode === 'number' ? details.statusCode : undefined
    }
  }

  return {
    message: String(error)
  }
}

function defaultModelForProvider(provider: string) {
  if (provider === 'google') return defaultGoogleModel
  if (provider === 'gateway') return defaultGatewayModel
  return null
}

function hasValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
