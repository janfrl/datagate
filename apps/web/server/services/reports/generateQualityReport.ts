import type { Finding, WorkflowRunResult } from '@datagate/shared'

const reportCategories: Finding['category'][] = ['privacy', 'schema', 'completeness', 'outliers']

export function generateQualityReport(result: WorkflowRunResult): string {
  const lines = [
    '# Data Gate Quality Report',
    '',
    '## Summary',
    '',
    `- Dataset: ${sanitizeText(result.datasetId)}`,
    `- Quality Score: ${result.qualityScore.score}/${result.qualityScore.maxScore}`,
    `- Total Findings: ${result.summary.totalFindings}`,
    `- Critical Findings: ${result.summary.criticalFindings}`,
    `- High Findings: ${result.summary.highFindings}`,
    '',
    '## Key Blockers',
    '',
    ...formatKeyBlockers(result.findings),
    '',
    '## Findings by Category',
    '',
    ...formatFindingsByCategory(result.findings),
    '',
    '## Recommended Next Actions',
    '',
    ...formatRecommendedActions(result.findings),
    ''
  ]

  return `${lines.join('\n').trimEnd()}\n`
}

function formatKeyBlockers(findings: Finding[]) {
  const blockers = findings.filter(finding => finding.severity === 'critical' || finding.severity === 'high')

  if (blockers.length === 0) {
    return ['- No critical or high-severity blockers were found.']
  }

  return blockers.map(finding => formatFindingBullet(finding))
}

function formatFindingsByCategory(findings: Finding[]) {
  return reportCategories.flatMap((category) => {
    const categoryFindings = findings.filter(finding => finding.category === category)
    const heading = `### ${categoryTitle(category)}`

    if (categoryFindings.length === 0) {
      return [heading, '', '- No findings.', '']
    }

    return [
      heading,
      '',
      ...categoryFindings.flatMap(finding => [
        formatFindingBullet(finding),
        ...formatEvidenceLines(finding.evidence)
      ]),
      ''
    ]
  })
}

function formatRecommendedActions(findings: Finding[]) {
  const actions = Array.from(new Set(findings.map(finding => sanitizeText(finding.recommendation))))

  if (actions.length === 0) {
    return ['- Continue with downstream use, and rerun the quality gate when the dataset changes.']
  }

  return actions.map(action => `- ${action}`)
}

function formatFindingBullet(finding: Finding) {
  const column = finding.column ? ` (${sanitizeText(finding.column)})` : ''

  return `- **${finding.severity.toUpperCase()}** ${sanitizeText(finding.title)}${column}: ${sanitizeText(finding.message)}`
}

function formatEvidenceLines(evidence: unknown) {
  const evidenceSummary = summarizeEvidence(evidence)

  return evidenceSummary ? [`  - Evidence: ${evidenceSummary}`] : []
}

function summarizeEvidence(evidence: unknown): string | undefined {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return undefined
  }

  const entries = Object.entries(evidence)
    .map(([key, value]) => summarizeEvidenceValue(key, value))
    .filter((entry): entry is string => Boolean(entry))

  return entries.length > 0 ? entries.join(', ') : undefined
}

function summarizeEvidenceValue(key: string, value: unknown): string | undefined {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${sanitizeText(key)}=${value}`
  }

  if (typeof value === 'string' && key === 'detection') {
    return `${sanitizeText(key)}=${sanitizeText(value)}`
  }

  return undefined
}

function categoryTitle(category: Finding['category']) {
  return category.charAt(0).toUpperCase() + category.slice(1)
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
