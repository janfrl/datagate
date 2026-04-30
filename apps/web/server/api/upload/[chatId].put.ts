export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Generic chat file uploads are disabled. Attach CSV files through the dataset upload flow.'
  })
})
