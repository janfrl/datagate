import type { ColumnProfile, DatasetProfile, Finding } from '@datagate/shared'
import { describe, expect, it } from 'vitest'
import { analyzeCompleteness, analyzeOutliers, analyzePii, analyzeSchema } from '.'

function profile(columns: ColumnProfile[], sampleRows: Record<string, unknown>[] = []): DatasetProfile {
  return {
    datasetId: 'dataset-1',
    rowCount: sampleRows.length || 10,
    columnCount: columns.length,
    columns,
    sampleRows
  }
}

function column(input: Partial<ColumnProfile> & Pick<ColumnProfile, 'name'>): ColumnProfile {
  return {
    originalName: input.name,
    wasGeneratedName: false,
    wasDuplicateName: false,
    inferredType: 'string',
    missingCount: 0,
    missingRatio: 0,
    uniqueCount: 1,
    examples: [],
    ...input
  }
}

function findingByTitle(findings: Finding[], title: string) {
  const finding = findings.find(candidate => candidate.title === title)

  expect(finding).toBeDefined()

  return finding!
}

describe('schema analysis', () => {
  it('detects generated empty header metadata', () => {
    const result = analyzeSchema(profile([
      column({
        name: 'column_1',
        originalName: '',
        wasGeneratedName: true
      })
    ]))

    const finding = findingByTitle(result.findings, 'Column name is empty')

    expect(finding.column).toBe('column_1')
    expect(finding.severity).toBe('high')
    expect(finding.evidence).toMatchObject({
      detection: 'generated-column-name'
    })
  })

  it('detects duplicate original header metadata', () => {
    const result = analyzeSchema(profile([
      column({
        name: 'email_2',
        originalName: 'email',
        wasDuplicateName: true
      })
    ]))

    const finding = findingByTitle(result.findings, 'Duplicate original column name detected')

    expect(finding.column).toBe('email_2')
    expect(finding.severity).toBe('high')
    expect(finding.evidence).toMatchObject({
      detection: 'duplicate-original-column-name'
    })
  })

  it('detects suspicious identifier columns', () => {
    const result = analyzeSchema(profile([
      column({
        name: 'customer_id',
        uniqueCount: 10
      })
    ]))

    const finding = findingByTitle(result.findings, 'Suspicious identifier column detected')

    expect(finding.column).toBe('customer_id')
    expect(finding.evidence).toMatchObject({
      detection: 'identifier-column-name',
      uniqueRatio: 1
    })
  })

  it('detects high-cardinality string columns over the row and ratio threshold', () => {
    const result = analyzeSchema(profile([
      column({
        name: 'session_label',
        inferredType: 'string',
        uniqueCount: 9
      })
    ]))

    const finding = findingByTitle(result.findings, 'High-cardinality string column detected')

    expect(finding.column).toBe('session_label')
    expect(finding.severity).toBe('low')
    expect(finding.evidence).toMatchObject({
      uniqueCount: 9,
      rowCount: 10,
      uniqueRatio: 0.9
    })
  })
})

describe('completeness analysis', () => {
  it('returns no findings when no columns have missing values', () => {
    const result = analyzeCompleteness(profile([
      column({ name: 'email', missingCount: 0, missingRatio: 0 })
    ]))

    expect(result.findings).toEqual([])
    expect(result.scoreImpact).toBe(0)
  })

  it.each([
    [0.1, 'low'],
    [0.5, 'medium'],
    [0.8, 'high']
  ] as const)('assigns %s missing ratio as %s severity', (missingRatio, severity) => {
    const result = analyzeCompleteness(profile([
      column({
        name: `missing_${severity}`,
        missingCount: Math.round(missingRatio * 10),
        missingRatio
      })
    ]))

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.severity).toBe(severity)
  })
})

describe('PII analysis', () => {
  it('detects email columns by name', () => {
    const result = analyzePii(profile([
      column({ name: 'email' })
    ]))

    expect(result.findings).toEqual([
      expect.objectContaining({
        column: 'email',
        severity: 'high',
        evidence: expect.objectContaining({
          detection: 'email-column-name'
        })
      })
    ])
  })

  it('detects email-like sample values', () => {
    const result = analyzePii(profile([
      column({ name: 'contact', examples: ['user@example.com'] })
    ], [
      { contact: 'other@example.com' }
    ]))

    expect(result.findings).toContainEqual(expect.objectContaining({
      column: 'contact',
      evidence: expect.objectContaining({
        detection: 'email-regex',
        matchedExamples: 1,
        matchedSampleRows: 1
      })
    }))
  })

  it('detects IP addresses', () => {
    const result = analyzePii(profile([
      column({ name: 'last_login_ip', examples: ['192.168.0.1'] })
    ]))

    expect(result.findings).toContainEqual(expect.objectContaining({
      column: 'last_login_ip',
      evidence: expect.objectContaining({
        detection: 'ip-address-regex',
        matchedExamples: 1
      })
    }))
  })

  it('detects phone-like values conservatively', () => {
    const result = analyzePii(profile([
      column({ name: 'support_number', examples: ['+1 (415) 555-0100', '555-0100'] })
    ]))

    expect(result.findings).toContainEqual(expect.objectContaining({
      column: 'support_number',
      evidence: expect.objectContaining({
        detection: 'phone-like-values',
        matchedExamples: 1
      })
    }))
  })

  it('does not include raw PII values in finding text or evidence', () => {
    const rawEmail = 'person@example.com'
    const rawIp = '203.0.113.7'
    const rawPhone = '+1 415 555 0100'
    const result = analyzePii(profile([
      column({
        name: 'contact',
        examples: [rawEmail, rawIp, rawPhone]
      })
    ], [
      { contact: rawEmail }
    ]))

    for (const finding of result.findings) {
      const serialized = JSON.stringify({
        message: finding.message,
        recommendation: finding.recommendation,
        evidence: finding.evidence
      })

      expect(serialized).not.toContain(rawEmail)
      expect(serialized).not.toContain(rawIp)
      expect(serialized).not.toContain(rawPhone)
    }
  })
})

describe('outlier analysis', () => {
  it('uses only numeric columns and detects IQR outliers with aggregate evidence', () => {
    const rows = [
      { amount: 10, label: 'a' },
      { amount: 11, label: 'b' },
      { amount: 12, label: 'c' },
      { amount: 13, label: 'd' },
      { amount: 14, label: 'e' },
      { amount: 100, label: 'extreme-row-value' }
    ]
    const result = analyzeOutliers({
      profile: profile([
        column({ name: 'amount', inferredType: 'number', uniqueCount: 6 }),
        column({ name: 'label', inferredType: 'string', uniqueCount: 6 })
      ], rows),
      rows
    })

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toEqual(expect.objectContaining({
      column: 'amount',
      title: 'Numeric outliers detected',
      evidence: {
        outlierCount: 1,
        outlierRatio: 1 / 6,
        lowerBound: 7.5,
        upperBound: 17.5
      }
    }))
    expect(JSON.stringify(result.findings)).not.toContain('100')
    expect(JSON.stringify(result.findings)).not.toContain('extreme-row-value')
  })
})
