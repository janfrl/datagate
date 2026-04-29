import { storeUploadedCsvDataset } from '../../services/datasets/storage'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find(part => part.filename)

  return storeUploadedCsvDataset(file)
})
