import type { PublicDataset } from '@datagate/shared'
import { tool } from 'ai'
import { z } from 'zod'
import { getArtifact as getStoredArtifact } from '../services/artifacts/artifactStore'
import { toSafeReportArtifactContent } from '../services/artifacts/artifactResponses'
import { toPublicDataset } from '../services/datasets/datasetResponses'
import { listDatasets as listStoredDatasets } from '../services/datasets/storage'
import { runDefaultQualityGateWorkflow } from '../services/workflows/runDefaultQualityGate'
import { toSafeWorkflowRunSummary } from '../services/workflows/workflowResponses'

type DataGateToolsOptions = {
  activeDataset?: PublicDataset | null
}

export function createDataGateTools(options: DataGateToolsOptions = {}) {
  const activeDataset = options.activeDataset ?? null

  return {
    listDatasets: tool({
      description: 'List uploaded Data Gate datasets using metadata only. If activeDataset is present, prefer it for the current chat instead of asking the user to choose from all datasets. Does not expose local storage paths or raw rows.',
      inputSchema: z.object({}),
      execute: async () => {
        const datasets = await listStoredDatasets()

        return {
          activeDataset,
          datasets: datasets.map(toPublicDataset)
        }
      }
    }),
    runDefaultQualityGate: tool({
      description: 'Run the existing Default Quality Gate workflow for one uploaded dataset. If datasetId is omitted, use the active dataset attached to the current chat. Returns a compact safe summary only, not raw dataset rows.',
      inputSchema: z.object({
        datasetId: z.string().uuid().optional().describe('The id of the dataset to analyze. Omit this when the current chat has an active dataset.')
      }),
      execute: async ({ datasetId }) => {
        const resolvedDatasetId = datasetId ?? activeDataset?.id

        if (!resolvedDatasetId) {
          return {
            error: 'NO_ACTIVE_DATASET',
            message: 'No active dataset is attached to this chat. Ask the user to upload a CSV or select a dataset before running the Default Quality Gate.'
          }
        }

        const result = await runDefaultQualityGateWorkflow(resolvedDatasetId)

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
}

export const dataGateTools = createDataGateTools()
