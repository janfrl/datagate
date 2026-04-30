import { toPublicDatasetProfile } from '../../../services/datasets/datasetResponses'
import { getDatasetProfile } from '../../../services/datasets/profile'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset id is required'
    })
  }

  return toPublicDatasetProfile(await getDatasetProfile(id))
})
