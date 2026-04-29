import { listDatasets } from '../../services/datasets/storage'

export default defineEventHandler(() => {
  return listDatasets()
})
