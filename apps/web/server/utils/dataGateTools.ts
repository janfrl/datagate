import { tool } from 'ai'
import { z } from 'zod'
import { getArtifact as getStoredArtifact } from '../services/artifacts/artifactStore'
import {
  toSafeDatasetMetadata,
  toSafeReportArtifactContent,
  toSafeWorkflowRunSummary
} from '../services/chat/dataGateToolResults'
import { listDatasets as listStoredDatasets } from '../services/datasets/storage'
import { runDefaultQualityGateWorkflow } from '../services/workflows/runDefaultQualityGate'

export const dataGateTools = {
  listDatasets: tool({
    description: 'List uploaded Data Gate datasets using metadata only. Does not expose local storage paths or raw rows.',
    inputSchema: z.object({}),
    execute: async () => {
      const datasets = await listStoredDatasets()

      return {
        datasets: datasets.map(toSafeDatasetMetadata)
      }
    }
  }),
  runDefaultQualityGate: tool({
    description: 'Run the existing Default Quality Gate workflow for one uploaded dataset. Returns a compact safe summary only, not raw dataset rows.',
    inputSchema: z.object({
      datasetId: z.string().uuid().describe('The id of the dataset to analyze.')
    }),
    execute: async ({ datasetId }) => {
      const result = await runDefaultQualityGateWorkflow(datasetId)

      return toSafeWorkflowRunSummary(result)
    }
  }),
  getArtifact: tool({
    description: 'Read an existing Data Gate report artifact by id. Only report artifacts are available to the chat agent.',
    inputSchema: z.object({
      artifactId: z.string().uuid().describe('The id of the report artifact to read.')
    }),
    execute: async ({ artifactId }) => {
      const artifact = await getStoredArtifact(artifactId)

      return toSafeReportArtifactContent(artifact)
    }
  })
}
