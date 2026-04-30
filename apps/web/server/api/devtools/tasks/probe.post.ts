import { z } from 'zod'
import { createTaskResultShape, devtoolsExpectedNitroTasks } from '../../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled } from '../../../utils/devtoolsAccess'

export default defineEventHandler(async (event) => {
  assertDataGateDevtoolsEnabled()

  const body = await readValidatedBody(event, z.object({
    datasetId: z.string().uuid()
  }).parse)

  const results = []

  for (const task of devtoolsExpectedNitroTasks) {
    try {
      const taskResult = await runTask(task.name, {
        payload: {
          datasetId: body.datasetId
        }
      })

      results.push({
        taskName: task.name,
        sourceFile: task.sourceFile,
        ok: true,
        resultShape: createTaskResultShape(taskResult)
      })
    } catch (error) {
      results.push({
        taskName: task.name,
        sourceFile: task.sourceFile,
        ok: false,
        error: createProbeError(error)
      })
    }
  }

  return {
    datasetId: body.datasetId,
    results
  }
})

function createProbeError(error: unknown) {
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
