import { analyzeCompleteness, analyzeOutliers, analyzePii, analyzeSchema } from '@datagate/tools'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { storeReportArtifact } from '../artifacts/artifactStore'
import { generateQualityReport } from '../reports/generateQualityReport'
import { profileCsv } from '../datasets/profile'
import { runConfiguredWorkflow } from './runWorkflow'
import { toSafeWorkflowRunSummary } from './workflowResponses'
import { defaultQualityGateWorkflow } from './workflows'

describe('Default Quality Gate flow', () => {
  it('profiles the sample CSV, runs checks, stores a report, and returns a safe summary', async () => {
    const datasetId = '9c793b5f-c84d-49f7-8b1c-7a7deed2c14a'
    const csv = await readFile(resolve(process.cwd(), '..', '..', 'samples', 'customers.csv'), 'utf8')
    const profile = profileCsv(datasetId, csv)
    const rows = profile.sampleRows
    const result = await runConfiguredWorkflow(defaultQualityGateWorkflow, datasetId, {
      createId: () => '7d856a94-c396-46d9-93ab-40f86d8ad8fa',
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      async taskRunner(taskId) {
        if (taskId === 'datagate:profile:schema') return analyzeSchema(profile)
        if (taskId === 'datagate:profile:completeness') return analyzeCompleteness(profile)
        if (taskId === 'datagate:profile:pii') return analyzePii(profile)
        if (taskId === 'datagate:profile:outliers') return analyzeOutliers({ profile, rows })

        throw new Error(`Unexpected task ${taskId}`)
      }
    })
    const artifact = await storeReportArtifact({
      datasetId,
      title: 'Data Gate Quality Report',
      content: generateQualityReport(result),
      storageDir: await mkdtemp(join(tmpdir(), 'datagate-flow-')),
      createId: () => 'e5d08eda-034d-4d18-a281-73282f990a71',
      now: () => new Date('2026-01-01T00:00:01.000Z')
    })
    const summary = toSafeWorkflowRunSummary({
      ...result,
      artifacts: {
        report: artifact.id
      }
    })

    expect(result.findings.length).toBeGreaterThan(0)
    expect(summary.reportArtifactId).toBe(artifact.id)
    expect(summary.topFindings.some(finding => finding.category === 'privacy')).toBe(true)
    expect(JSON.stringify(summary)).not.toContain('example.com')
    expect(JSON.stringify(summary)).not.toContain('555')
    expect(JSON.stringify(summary)).not.toContain('sampleRows')
  })
})
