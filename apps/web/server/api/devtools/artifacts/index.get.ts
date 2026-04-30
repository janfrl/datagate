import { listArtifacts } from '../../../services/artifacts/artifactStore'
import { assertDataGateDevtoolsEnabled } from '../../../utils/devtoolsAccess'

export default defineEventHandler(async () => {
  assertDataGateDevtoolsEnabled()

  const artifacts = await listArtifacts()

  return {
    artifacts: artifacts.map(artifact => ({
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      datasetId: artifact.datasetId,
      chatId: artifact.chatId,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt
    }))
  }
})
