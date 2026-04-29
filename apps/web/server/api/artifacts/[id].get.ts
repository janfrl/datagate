import { getArtifact } from '../../services/artifacts/artifactStore'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Artifact id is required'
    })
  }

  return getArtifact(id)
})
