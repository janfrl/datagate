import type { Artifact, Dataset, Finding, WorkflowRunResult } from '@datagate/shared'

export type SafeDatasetMetadata = Pick<Dataset, 'id' | 'filename' | 'uploadedAt' | 'size' | 'mimeType'>

export type SafeFindingSummary = Pick<Finding, 'id' | 'category' | 'severity' | 'column' | 'title' | 'message' | 'recommendation'>

export type SafeWorkflowRunSummary = {
  workflowRunId: string
  datasetId: string
  qualityScore: WorkflowRunResult['qualityScore']
  severityCounts: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  topFindings: SafeFindingSummary[]
  reportArtifactId?: string
}

export type SafeArtifactContent = {
  id: string
  type: Artifact['type']
  title: string
  datasetId?: string
  createdAt: string
  updatedAt: string
  content: string
  truncated: boolean
}

const maxTopFindingCount = 5
const maxArtifactContentLength = 12_000

export function toSafeDatasetMetadata(dataset: Dataset): SafeDatasetMetadata {
  return {
    id: dataset.id,
    filename: dataset.filename,
    uploadedAt: dataset.uploadedAt,
    size: dataset.size,
    mimeType: dataset.mimeType
  }
}

export function toSafeWorkflowRunSummary(result: WorkflowRunResult): SafeWorkflowRunSummary {
  return {
    workflowRunId: result.id,
    datasetId: result.datasetId,
    qualityScore: result.qualityScore,
    severityCounts: {
      critical: result.summary.criticalFindings,
      high: result.summary.highFindings,
      medium: result.summary.mediumFindings,
      low: result.summary.lowFindings,
      info: result.summary.infoFindings
    },
    topFindings: result.findings
      .filter(finding => finding.severity === 'critical' || finding.severity === 'high')
      .slice(0, maxTopFindingCount)
      .map(toSafeFindingSummary),
    reportArtifactId: result.artifacts?.report
  }
}

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

function toSafeFindingSummary(finding: Finding): SafeFindingSummary {
  return {
    id: finding.id,
    category: finding.category,
    severity: finding.severity,
    column: finding.column ? sanitizeText(finding.column) : undefined,
    title: sanitizeText(finding.title),
    message: sanitizeText(finding.message),
    recommendation: sanitizeText(finding.recommendation)
  }
}

function sanitizeText(value: string) {
  return value
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[redacted-email]')
    .replace(/\b(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g, '[redacted-ip]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, (match) => {
      const digitCount = match.replace(/\D/g, '').length

      return digitCount >= 10 && digitCount <= 15 ? '[redacted-phone]' : match
    })
}
