import type { Artifact, SafeArtifactContent } from '@datagate/shared'
import { sanitizeText } from '../privacy/sanitizeText'

const maxArtifactContentLength = 12_000

export function toSafeReportArtifactContent(artifact: Artifact): SafeArtifactContent {
  if (artifact.type !== 'report') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only report artifacts can be read by the chat agent'
    })
  }

  const fullContent = sanitizeText(String(artifact.content))
  const truncated = fullContent.length > maxArtifactContentLength
  const content = truncated
    ? `${fullContent.slice(0, maxArtifactContentLength).trimEnd()}\n\n[Report excerpt truncated for chat.]`
    : fullContent

  return {
    id: artifact.id,
    type: artifact.type,
    title: sanitizeText(artifact.title),
    datasetId: artifact.datasetId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    content,
    truncated
  }
}
