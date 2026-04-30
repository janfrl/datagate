import type { Dataset, DatasetProfile, PublicDataset, PublicDatasetProfile } from '@datagate/shared'

export function toPublicDataset(dataset: Dataset): PublicDataset {
  return {
    id: dataset.id,
    filename: dataset.filename,
    uploadedAt: dataset.uploadedAt,
    size: dataset.size,
    mimeType: dataset.mimeType
  }
}

export function toPublicDatasetProfile(profile: DatasetProfile): PublicDatasetProfile {
  return {
    datasetId: profile.datasetId,
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    columns: profile.columns.map(({ examples: _examples, ...column }) => column)
  }
}
