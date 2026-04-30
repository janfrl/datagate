import { toSafeReportArtifactContent } from '../../services/artifacts/artifactResponses'
import { getArtifact } from '../../services/artifacts/artifactStore'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Artifact id is required'
    })
  }

  return toSafeReportArtifactContent(await getArtifact(id))
})
