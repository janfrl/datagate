import type { DatasetProfile, Finding, ToolResult } from '@datagate/shared'
import { createFinding, outliersToolId, scoreImpact } from './utils'

type OutlierInput = {
  profile: DatasetProfile
  rows: Record<string, unknown>[]
}

export function analyzeOutliers({ profile, rows }: OutlierInput): ToolResult {
  const findings: Finding[] = []

  for (const column of profile.columns.filter(column => column.inferredType === 'number')) {
    const values = rows
      .map(row => toNumber(row[column.name]))
      .filter((value): value is number => value !== undefined)

    if (values.length < 4) continue

    const summary = findIqrOutliers(values)

    if (summary.outlierRatio <= 0) continue

    findings.push(createFinding({
      toolId: outliersToolId,
      category: 'outliers',
      severity: outlierSeverity(summary.outlierRatio),
      column: column.name,
      title: 'Numeric outliers detected',
      message: `Column "${column.name}" has ${summary.outlierCount} value${summary.outlierCount === 1 ? '' : 's'} outside the IQR bounds.`,
      recommendation: 'Inspect these records for data entry errors, unit mismatches, or legitimate extreme values before using the dataset downstream.',
      evidence: {
        outlierCount: summary.outlierCount,
        outlierRatio: summary.outlierRatio,
        lowerBound: summary.lowerBound,
        upperBound: summary.upperBound
      }
    }))
  }

  return {
    toolId: outliersToolId,
    findings,
    scoreImpact: scoreImpact(findings)
  }
}

function findIqrOutliers(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = percentile(sorted, 0.25)
  const q3 = percentile(sorted, 0.75)
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outlierCount = sorted.filter(value => value < lowerBound || value > upperBound).length

  return {
    outlierCount,
    outlierRatio: outlierCount / values.length,
    lowerBound,
    upperBound
  }
}

function percentile(sortedValues: number[], percentileValue: number) {
  const index = (sortedValues.length - 1) * percentileValue
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  return sortedValues[lower]! * (1 - weight) + sortedValues[upper]! * weight
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}

function outlierSeverity(outlierRatio: number): Finding['severity'] {
  if (outlierRatio >= 0.1) return 'medium'

  return 'low'
}
