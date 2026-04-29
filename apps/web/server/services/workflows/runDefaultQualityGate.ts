import type { WorkflowRunResult } from '@datagate/shared'
import { storeReportArtifact } from '../artifacts/artifactStore'
import { generateQualityReport } from '../reports/generateQualityReport'
import { runWorkflow } from './runWorkflow'

export async function runDefaultQualityGateWorkflow(datasetId: string): Promise<WorkflowRunResult> {
  const result = await runWorkflow('default-quality-gate', datasetId)
  const report = await storeReportArtifact({
    datasetId,
    title: 'Data Gate Quality Report',
    content: generateQualityReport(result)
  })

  return {
    ...result,
    artifacts: {
      ...result.artifacts,
      report: report.id
    }
  }
}
