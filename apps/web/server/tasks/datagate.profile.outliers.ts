import { analyzeOutliers } from '@datagate/tools'
import type { ToolResult } from '@datagate/shared'
import { getDatasetProfile, getDatasetRows } from '../services/datasets/profile'

type DatasetTaskPayload = {
  datasetId: string
}

export default defineTask<ToolResult>({
  meta: {
    name: 'datagate:profile:outliers',
    description: 'Detects numeric outliers using IQR bounds.'
  },
  async run({ payload }) {
    const { datasetId } = validatePayload(payload)
    const [profile, rows] = await Promise.all([
      getDatasetProfile(datasetId),
      getDatasetRows(datasetId)
    ])
    const result: ToolResult = analyzeOutliers({ profile, rows })

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
