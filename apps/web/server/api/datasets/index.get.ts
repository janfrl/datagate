import { toPublicDataset } from '../../services/datasets/datasetResponses'
import { listDatasets } from '../../services/datasets/storage'

export default defineEventHandler(async () => {
  const datasets = await listDatasets()

  return datasets.map(toPublicDataset)
})
