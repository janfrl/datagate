export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Chat file uploads are disabled. Upload CSV datasets from the Datasets page.'
  })
})
