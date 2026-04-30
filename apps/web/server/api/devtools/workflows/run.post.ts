import { z } from 'zod'
import { runDefaultQualityGateWorkflow } from '../../../services/workflows/runDefaultQualityGate'
import { assertDataGateDevtoolsEnabled } from '../../../utils/devtoolsAccess'

export default defineEventHandler(async (event) => {
  assertDataGateDevtoolsEnabled()

  const body = await readValidatedBody(event, z.object({
    workflowId: z.literal('default-quality-gate').default('default-quality-gate'),
    datasetId: z.string().uuid()
  }).parse)

  try {
    const result = await runDefaultQualityGateWorkflow(body.datasetId)

    return {
      ok: true,
      result
    }
  } catch (error) {
    return {
      ok: false,
      error: createDebugError(error)
    }
  }
})

function createDebugError(error: unknown) {
  if (error && typeof error === 'object') {
    const details = error as {
      message?: unknown
      statusMessage?: unknown
      statusCode?: unknown
      stack?: unknown
    }

    return {
      message: typeof details.message === 'string'
        ? details.message
        : typeof details.statusMessage === 'string' ? details.statusMessage : 'Workflow run failed',
      statusMessage: typeof details.statusMessage === 'string' ? details.statusMessage : undefined,
      statusCode: typeof details.statusCode === 'number' ? details.statusCode : undefined,
      stack: process.env.NODE_ENV !== 'production' && typeof details.stack === 'string' ? details.stack : undefined
    }
  }

  return {
    message: String(error)
  }
}
