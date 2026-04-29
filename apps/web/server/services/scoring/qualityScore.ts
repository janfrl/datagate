import type { Finding, QualityScore, QualityScoreBreakdownItem } from '@datagate/shared'

const maxScore = 100
const scoredCategories = ['schema', 'completeness', 'privacy', 'outliers'] satisfies Finding['category'][]
const categoryMaxScore = maxScore / scoredCategories.length

const severityImpacts: Record<Finding['severity'], number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1
}

export function calculateQualityScore(findings: Finding[]): QualityScore {
  const breakdown = scoredCategories.map(category => scoreCategory(category, findings))
  const score = clampScore(breakdown.reduce((total, item) => total + item.score, 0), maxScore)

  return {
    score,
    maxScore,
    breakdown
  }
}

function scoreCategory(category: Finding['category'], findings: Finding[]): QualityScoreBreakdownItem {
  const categoryFindings = findings.filter(finding => finding.category === category)
  const impact = clampScore(categoryFindings.reduce((total, finding) => total + severityImpacts[finding.severity], 0), categoryMaxScore)

  return {
    category,
    score: categoryMaxScore - impact,
    maxScore: categoryMaxScore,
    impact,
    findingCount: categoryFindings.length
  }
}

function clampScore(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, value))
}
