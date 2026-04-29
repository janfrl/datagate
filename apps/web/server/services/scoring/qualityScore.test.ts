import type { Finding } from '@datagate/shared'
import { describe, expect, it } from 'vitest'
import { calculateQualityScore } from './qualityScore'

function finding(id: string, category: Finding['category'], severity: Finding['severity']): Finding {
  return {
    id,
    category,
    severity,
    title: `${category} ${severity}`,
    message: `${category} ${severity} message`,
    recommendation: `${category} ${severity} recommendation`
  }
}

describe('quality score', () => {
  it('returns a perfect score when there are no findings', () => {
    expect(calculateQualityScore([])).toEqual({
      score: 100,
      maxScore: 100,
      breakdown: [
        {
          category: 'schema',
          score: 25,
          maxScore: 25,
          impact: 0,
          findingCount: 0
        },
        {
          category: 'completeness',
          score: 25,
          maxScore: 25,
          impact: 0,
          findingCount: 0
        },
        {
          category: 'privacy',
          score: 25,
          maxScore: 25,
          impact: 0,
          findingCount: 0
        },
        {
          category: 'outliers',
          score: 25,
          maxScore: 25,
          impact: 0,
          findingCount: 0
        }
      ]
    })
  })

  it('subtracts deterministic severity impacts by category', () => {
    const score = calculateQualityScore([
      finding('schema-high', 'schema', 'high'),
      finding('schema-low', 'schema', 'low'),
      finding('completeness-medium', 'completeness', 'medium'),
      finding('privacy-critical', 'privacy', 'critical'),
      finding('outliers-info', 'outliers', 'info')
    ])

    expect(score).toEqual({
      score: 48,
      maxScore: 100,
      breakdown: [
        {
          category: 'schema',
          score: 7,
          maxScore: 25,
          impact: 18,
          findingCount: 2
        },
        {
          category: 'completeness',
          score: 17,
          maxScore: 25,
          impact: 8,
          findingCount: 1
        },
        {
          category: 'privacy',
          score: 0,
          maxScore: 25,
          impact: 25,
          findingCount: 1
        },
        {
          category: 'outliers',
          score: 24,
          maxScore: 25,
          impact: 1,
          findingCount: 1
        }
      ]
    })
  })

  it('caps category impact at the category max score', () => {
    const score = calculateQualityScore([
      finding('privacy-critical-1', 'privacy', 'critical'),
      finding('privacy-critical-2', 'privacy', 'critical')
    ])

    expect(score.breakdown.find(item => item.category === 'privacy')).toEqual({
      category: 'privacy',
      score: 0,
      maxScore: 25,
      impact: 25,
      findingCount: 2
    })
    expect(score.score).toBe(75)
  })

  it('does not let unscored categories affect the default quality gate score', () => {
    expect(calculateQualityScore([
      finding('readiness-critical', 'readiness', 'critical')
    ])).toEqual(calculateQualityScore([]))
  })
})
