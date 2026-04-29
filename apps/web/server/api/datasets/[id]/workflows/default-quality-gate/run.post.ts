import { runWorkflow } from '../../../../../services/workflows/runWorkflow'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset id is required'
    })
  }

  return runWorkflow('default-quality-gate', id)
})
