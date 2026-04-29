import { getDatasetProfile } from '../../../services/datasets/profile'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset id is required'
    })
  }

  return getDatasetProfile(id)
})
