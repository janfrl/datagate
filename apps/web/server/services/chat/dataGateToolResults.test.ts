import type { Artifact, Dataset, WorkflowRunResult } from '@datagate/shared'
import { describe, expect, it } from 'vitest'
import {
  toSafeDatasetMetadata,
  toSafeReportArtifactContent,
  toSafeWorkflowRunSummary
} from './dataGateToolResults'

describe('Data Gate chat tool result helpers', () => {
  it('omits local storage paths from dataset metadata', () => {
    const dataset: Dataset = {
      id: '9c793b5f-c84d-49f7-8b1c-7a7deed2c14a',
      filename: 'customers.csv',
      mimeType: 'text/csv',
      size: 1234,
      uploadedAt: '2026-01-01T00:00:00.000Z',
      storagePath: 'C:\\private\\uploads\\customers.csv'
    }

    expect(toSafeDatasetMetadata(dataset)).toEqual({
      id: dataset.id,
      filename: dataset.filename,
      mimeType: dataset.mimeType,
      size: dataset.size,
      uploadedAt: dataset.uploadedAt
    })
    expect(toSafeDatasetMetadata(dataset)).not.toHaveProperty('storagePath')
  })

  it('returns a compact workflow summary without task results or evidence', () => {
    const result: WorkflowRunResult = {
      id: '7d856a94-c396-46d9-93ab-40f86d8ad8fa',
      workflowId: 'default-quality-gate',
      datasetId: '9c793b5f-c84d-49f7-8b1c-7a7deed2c14a',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
      taskResults: [
        {
          toolId: 'datagate:profile:pii',
          scoreImpact: 25,
          findings: []
        }
      ],
      findings: [
        {
          id: 'privacy-1',
          category: 'privacy',
          severity: 'critical',
          column: 'email',
          title: 'Email addresses detected for jane@example.com',
          message: 'Column contains jane@example.com and 192.168.0.1.',
          recommendation: 'Redact +1 (415) 555-0100 before AI use.',
          evidence: {
            matchedValue: 'jane@example.com'
          }
        },
        {
          id: 'schema-1',
          category: 'schema',
          severity: 'medium',
          title: 'Duplicate column',
          message: 'Column names were duplicated.',
          recommendation: 'Rename duplicate columns.'
        }
      ],
      summary: {
        totalFindings: 2,
        criticalFindings: 1,
        highFindings: 0,
        mediumFindings: 1,
        lowFindings: 0,
        infoFindings: 0
      },
      qualityScore: {
        score: 50,
        maxScore: 100,
        breakdown: []
      },
      artifacts: {
        report: 'e5d08eda-034d-4d18-a281-73282f990a71'
      }
    }

    const summary = toSafeWorkflowRunSummary(result)

    expect(summary).toEqual({
      workflowRunId: result.id,
      datasetId: result.datasetId,
      qualityScore: result.qualityScore,
      severityCounts: {
        critical: 1,
        high: 0,
        medium: 1,
        low: 0,
        info: 0
      },
      topFindings: [
        {
          id: 'privacy-1',
          category: 'privacy',
          severity: 'critical',
          column: 'email',
          title: 'Email addresses detected for [redacted-email]',
          message: 'Column contains [redacted-email] and [redacted-ip].',
          recommendation: 'Redact [redacted-phone] before AI use.'
        }
      ],
      reportArtifactId: result.artifacts?.report
    })
    expect(summary).not.toHaveProperty('taskResults')
    expect(summary.topFindings[0]).not.toHaveProperty('evidence')
  })

  it('returns sanitized report artifact content only for report artifacts', () => {
    const artifact: Artifact = {
      id: 'e5d08eda-034d-4d18-a281-73282f990a71',
      type: 'report',
      title: 'Report for jane@example.com',
      datasetId: '9c793b5f-c84d-49f7-8b1c-7a7deed2c14a',
      content: 'Email jane@example.com and IP 192.168.0.1 were detected.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }

    expect(toSafeReportArtifactContent(artifact)).toMatchObject({
      id: artifact.id,
      type: 'report',
      title: 'Report for [redacted-email]',
      content: 'Email [redacted-email] and IP [redacted-ip] were detected.',
      truncated: false
    })
  })
})
