import { toPublicDataset } from '../../services/datasets/datasetResponses'
import { storeUploadedCsvDataset } from '../../services/datasets/storage'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find(part => part.filename)

  return toPublicDataset(await storeUploadedCsvDataset(file))
})
