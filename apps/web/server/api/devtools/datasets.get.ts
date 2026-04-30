import { toPublicDataset } from '../../services/datasets/datasetResponses'
import { listDatasets } from '../../services/datasets/storage'
import { assertDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

export default defineEventHandler(async () => {
  assertDataGateDevtoolsEnabled()

  const datasets = await listDatasets()

  return {
    datasets: datasets.map(toPublicDataset)
  }
})
