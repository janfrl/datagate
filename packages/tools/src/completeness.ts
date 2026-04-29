import type { DatasetProfile, Finding, ToolResult } from '@datagate/shared'
import { completenessToolId, createFinding, formatPercent, scoreImpact } from './utils'

export function analyzeCompleteness(profile: DatasetProfile): ToolResult {
  const findings = profile.columns
    .filter(column => column.missingRatio > 0)
    .map(column => createFinding({
      toolId: completenessToolId,
      category: 'completeness',
      severity: completenessSeverity(column.missingRatio),
      column: column.name,
      title: 'Column has missing values',
      message: `Column "${column.name}" is missing ${formatPercent(column.missingRatio)} of its values.`,
      recommendation: completenessRecommendation(column.missingRatio),
      evidence: {
        missingCount: column.missingCount,
        missingRatio: column.missingRatio,
        rowCount: profile.rowCount
      }
    }))

  return {
    toolId: completenessToolId,
    findings,
    scoreImpact: scoreImpact(findings)
  }
}

function completenessSeverity(missingRatio: number): Finding['severity'] {
  if (missingRatio >= 0.8) return 'high'
  if (missingRatio >= 0.5) return 'medium'

  return 'low'
}

function completenessRecommendation(missingRatio: number) {
  if (missingRatio >= 0.8) {
    return 'Consider removing the column or recollecting the data.'
  }

  if (missingRatio >= 0.5) {
    return 'Investigate whether the column is required and whether imputation is valid.'
  }

  return 'Consider imputation or explicit missing-value handling.'
}
