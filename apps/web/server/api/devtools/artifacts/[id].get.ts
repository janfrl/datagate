import { toSafeReportArtifactContent } from '../../../services/artifacts/artifactResponses'
import { getArtifact } from '../../../services/artifacts/artifactStore'
import { assertDataGateDevtoolsEnabled } from '../../../utils/devtoolsAccess'

export default defineEventHandler(async (event) => {
  assertDataGateDevtoolsEnabled()

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Artifact id is required'
    })
  }

  const artifact = await getArtifact(id)
  const metadata = {
    id: artifact.id,
    type: artifact.type,
    title: artifact.title,
    datasetId: artifact.datasetId,
    chatId: artifact.chatId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt
  }

  if (artifact.type !== 'report') {
    return {
      metadata,
      report: null
    }
  }

  return {
    metadata,
    report: toSafeReportArtifactContent(artifact)
  }
})
