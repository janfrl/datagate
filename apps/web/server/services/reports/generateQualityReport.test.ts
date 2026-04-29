import type { Finding, WorkflowRunResult } from '@datagate/shared'
import { describe, expect, it } from 'vitest'
import { generateQualityReport } from './generateQualityReport'

function finding(input: Partial<Finding> & Pick<Finding, 'id' | 'category' | 'severity'>): Finding {
  return {
    title: `${input.category} ${input.severity}`,
    message: `${input.category} ${input.severity} message`,
    recommendation: `${input.category} ${input.severity} recommendation`,
    ...input
  }
}

function workflowResult(findings: Finding[]): WorkflowRunResult {
  return {
    id: 'run-1',
    workflowId: 'default-quality-gate',
    datasetId: 'dataset-1',
    status: 'completed',
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:00:01.000Z',
    taskResults: [],
    findings,
    summary: {
      totalFindings: findings.length,
      criticalFindings: findings.filter(item => item.severity === 'critical').length,
      highFindings: findings.filter(item => item.severity === 'high').length,
      mediumFindings: findings.filter(item => item.severity === 'medium').length,
      lowFindings: findings.filter(item => item.severity === 'low').length,
      infoFindings: findings.filter(item => item.severity === 'info').length
    },
    qualityScore: {
      score: 82,
      maxScore: 100,
      breakdown: []
    }
  }
}

describe('quality report generation', () => {
  it('includes the quality score and summary counts', () => {
    const report = generateQualityReport(workflowResult([
      finding({ id: 'privacy-high', category: 'privacy', severity: 'high' })
    ]))

    expect(report).toContain('# Data Gate Quality Report')
    expect(report).toContain('- Dataset: dataset-1')
    expect(report).toContain('- Quality Score: 82/100')
    expect(report).toContain('- Total Findings: 1')
    expect(report).toContain('- High Findings: 1')
  })

  it('groups findings by category', () => {
    const report = generateQualityReport(workflowResult([
      finding({ id: 'privacy-high', category: 'privacy', severity: 'high' }),
      finding({ id: 'schema-low', category: 'schema', severity: 'low' }),
      finding({ id: 'completeness-medium', category: 'completeness', severity: 'medium' }),
      finding({ id: 'outliers-info', category: 'outliers', severity: 'info' })
    ]))

    expect(report).toMatch(/### Privacy[\s\S]*privacy high/)
    expect(report).toMatch(/### Schema[\s\S]*schema low/)
    expect(report).toMatch(/### Completeness[\s\S]*completeness medium/)
    expect(report).toMatch(/### Outliers[\s\S]*outliers info/)
  })

  it('lists critical and high findings as blockers', () => {
    const report = generateQualityReport(workflowResult([
      finding({ id: 'privacy-critical', category: 'privacy', severity: 'critical' }),
      finding({ id: 'schema-high', category: 'schema', severity: 'high' }),
      finding({ id: 'outliers-low', category: 'outliers', severity: 'low' })
    ]))
    const blockerSection = report.slice(
      report.indexOf('## Key Blockers'),
      report.indexOf('## Findings by Category')
    )

    expect(blockerSection).toContain('**CRITICAL** privacy critical')
    expect(blockerSection).toContain('**HIGH** schema high')
    expect(blockerSection).not.toContain('outliers low')
  })

  it('redacts raw PII-like values from finding text and evidence', () => {
    const rawEmail = 'person@example.com'
    const rawIp = '203.0.113.7'
    const rawPhone = '+1 415 555 0100'
    const report = generateQualityReport(workflowResult([
      finding({
        id: 'privacy-high',
        category: 'privacy',
        severity: 'high',
        message: `Found ${rawEmail} from ${rawIp} and ${rawPhone}`,
        recommendation: `Remove ${rawEmail}`,
        evidence: {
          detection: 'email-regex',
          rawEmail,
          rawIp,
          rawPhone,
          matchedSampleRows: 1
        }
      })
    ]))

    expect(report).not.toContain(rawEmail)
    expect(report).not.toContain(rawIp)
    expect(report).not.toContain(rawPhone)
    expect(report).toContain('[redacted-email]')
    expect(report).toContain('[redacted-ip]')
    expect(report).toContain('[redacted-phone]')
    expect(report).toContain('matchedSampleRows=1')
    expect(report).not.toContain('rawEmail=')
  })
})
