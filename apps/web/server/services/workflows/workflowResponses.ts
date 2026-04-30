import type { Finding, SafeFindingSummary, SafeWorkflowRunSummary, WorkflowRunResult } from '@datagate/shared'
import { sanitizeText } from '../privacy/sanitizeText'

const maxTopFindingCount = 5
const maxRecommendationCount = 5

export function toSafeWorkflowRunSummary(result: WorkflowRunResult): SafeWorkflowRunSummary {
  const blockerFindings = result.findings
    .filter(finding => finding.severity === 'critical' || finding.severity === 'high')

  return {
    workflowRunId: result.id,
    datasetId: result.datasetId,
    status: result.status,
    qualityScore: result.qualityScore,
    severityCounts: {
      critical: result.summary.criticalFindings,
      high: result.summary.highFindings,
      medium: result.summary.mediumFindings,
      low: result.summary.lowFindings,
      info: result.summary.infoFindings
    },
    topFindings: blockerFindings
      .slice(0, maxTopFindingCount)
      .map(toSafeFindingSummary),
    recommendations: Array.from(new Set(
      blockerFindings.length > 0
        ? blockerFindings.map(finding => sanitizeText(finding.recommendation))
        : result.findings.map(finding => sanitizeText(finding.recommendation))
    )).slice(0, maxRecommendationCount),
    reportArtifactId: result.artifacts?.report
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
