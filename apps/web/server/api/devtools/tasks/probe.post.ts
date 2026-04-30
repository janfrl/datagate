import { z } from 'zod'
import { createTaskResultShape, devtoolsExpectedNitroTasks } from '../../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled } from '../../../utils/devtoolsAccess'

export default defineEventHandler(async (event) => {
  assertDataGateDevtoolsEnabled()

  const body = await readValidatedBody(event, z.object({
    datasetId: z.string().uuid(),
    taskName: z.string().optional()
  }).parse)

  const tasks = body.taskName
    ? devtoolsExpectedNitroTasks.filter(task => task.name === body.taskName)
    : devtoolsExpectedNitroTasks

  if (body.taskName && tasks.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown task: ${body.taskName}`
    })
  }

  const results = []

  for (const task of tasks) {
    const startedAt = Date.now()

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
        durationMs: Date.now() - startedAt,
        resultShape: createTaskResultShape(taskResult)
      })
    } catch (error) {
      results.push({
        taskName: task.name,
        sourceFile: task.sourceFile,
        ok: false,
        durationMs: Date.now() - startedAt,
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
