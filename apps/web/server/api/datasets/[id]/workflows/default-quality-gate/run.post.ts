import { runDefaultQualityGateWorkflow } from '../../../../../services/workflows/runDefaultQualityGate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset id is required'
    })
  }

  return runDefaultQualityGateWorkflow(id)
})
