import { analyzeCompleteness } from '@datagate/tools'
import type { ToolResult } from '@datagate/shared'
import { getDatasetProfile } from '../services/datasets/profile'

type DatasetTaskPayload = {
  datasetId: string
}

export default defineTask<ToolResult>({
  meta: {
    name: 'datagate:profile:completeness',
    description: 'Detects missing-value issues in a dataset profile.'
  },
  async run({ payload }) {
    const { datasetId } = validatePayload(payload)
    const profile = await getDatasetProfile(datasetId)
    const result: ToolResult = analyzeCompleteness(profile)

    return {
      result
    }
  }
})

function validatePayload(payload: unknown): DatasetTaskPayload {
  if (!payload || typeof payload !== 'object' || typeof (payload as Partial<DatasetTaskPayload>).datasetId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task payload must include a datasetId'
    })
  }

  return {
    datasetId: (payload as DatasetTaskPayload).datasetId
  }
}
