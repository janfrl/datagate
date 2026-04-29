import type { Finding } from '@datagate/shared'

export const schemaToolId = 'datagate:profile:schema'
export const completenessToolId = 'datagate:profile:completeness'
export const piiToolId = 'datagate:profile:pii'
export const outliersToolId = 'datagate:profile:outliers'

export function createFinding(input: Omit<Finding, 'id'> & { toolId: string }): Finding {
  const columnPart = input.column ? `:${stableIdPart(input.column)}` : ''

  return {
    id: `${input.toolId}${columnPart}:${stableIdPart(input.title)}`,
    category: input.category,
    severity: input.severity,
    column: input.column,
    title: input.title,
    message: input.message,
    recommendation: input.recommendation,
    evidence: input.evidence
  }
}

export function severityImpact(severity: Finding['severity']) {
  switch (severity) {
    case 'critical':
      return 25
    case 'high':
      return 15
    case 'medium':
      return 8
    case 'low':
      return 3
    case 'info':
      return 1
  }
}

export function scoreImpact(findings: Finding[]) {
  return Math.min(100, findings.reduce((impact, finding) => impact + severityImpact(finding.severity), 0))
}

export function uniqueRatio(uniqueCount: number, rowCount: number) {
  return rowCount === 0 ? 0 : uniqueCount / rowCount
}

export function formatPercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`
}

export function normalizeName(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function stringValues(values: unknown[]) {
  return values.filter((value): value is string => typeof value === 'string').map(value => value.trim())
}

function stableIdPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
