import { builtInWorkflows } from '../services/workflows/workflows'

export type DevtoolsToolDefinition = {
  id: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
}

export type DevtoolsTaskDefinition = {
  name: string
  description: string
  sourceFile: string
  inputSchema: Record<string, unknown>
}

const datasetIdParameter = {
  type: 'object',
  required: ['datasetId'],
  properties: {
    datasetId: {
      type: 'string',
      format: 'uuid',
      description: 'Uploaded dataset id.'
    }
  }
}

export const devtoolsHighLevelTools: DevtoolsToolDefinition[] = [
  {
    id: 'listDatasets',
    title: 'List datasets',
    description: 'Lists uploaded dataset metadata only. Does not expose storage paths or raw rows.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    id: 'runDefaultQualityGate',
    title: 'Run Default Quality Gate',
    description: 'Runs the built-in deterministic workflow for an uploaded dataset. Chat may omit datasetId when a chat has an active dataset.',
    inputSchema: {
      type: 'object',
      properties: {
        datasetId: {
          type: 'string',
          format: 'uuid',
          description: 'Optional for chat tools when an active dataset is attached; required for manual DevTools runs.'
        }
      }
    }
  },
  {
    id: 'getArtifact',
    title: 'Get artifact',
    description: 'Reads a report artifact by id for chat-safe inspection.',
    inputSchema: {
      type: 'object',
      required: ['artifactId'],
      properties: {
        artifactId: {
          type: 'string',
          format: 'uuid',
          description: 'Report artifact id.'
        }
      }
    }
  }
]

export const devtoolsExpectedNitroTasks: DevtoolsTaskDefinition[] = [
  {
    name: 'datagate:profile:schema',
    description: 'Detects schema issues in a dataset profile.',
    sourceFile: 'server/tasks/datagate.profile.schema.ts',
    inputSchema: datasetIdParameter
  },
  {
    name: 'datagate:profile:completeness',
    description: 'Detects missing-value issues in a dataset profile.',
    sourceFile: 'server/tasks/datagate.profile.completeness.ts',
    inputSchema: datasetIdParameter
  },
  {
    name: 'datagate:profile:pii',
    description: 'Detects deterministic PII signals in a dataset profile.',
    sourceFile: 'server/tasks/datagate.profile.pii.ts',
    inputSchema: datasetIdParameter
  },
  {
    name: 'datagate:profile:outliers',
    description: 'Detects numeric outliers using IQR bounds.',
    sourceFile: 'server/tasks/datagate.profile.outliers.ts',
    inputSchema: datasetIdParameter
  }
]

export const devtoolsBuiltInWorkflows = builtInWorkflows.map(workflow => ({
  id: workflow.id,
  title: workflow.title,
  description: workflow.description,
  taskIds: [...workflow.taskIds]
}))

export function createTaskResultShape(value: unknown) {
  const result = normalizeTaskProbeResult(value)

  if (!result || typeof result !== 'object') {
    return {
      type: typeof result
    }
  }

  const toolResult = result as {
    toolId?: unknown
    findings?: unknown
    scoreImpact?: unknown
  }

  return {
    keys: Object.keys(result),
    toolId: typeof toolResult.toolId === 'string' ? toolResult.toolId : undefined,
    findingCount: Array.isArray(toolResult.findings) ? toolResult.findings.length : undefined,
    scoreImpact: typeof toolResult.scoreImpact === 'number' ? toolResult.scoreImpact : undefined
  }
}

function normalizeTaskProbeResult(value: unknown) {
  if (value && typeof value === 'object' && 'result' in value) {
    return (value as { result: unknown }).result
  }

  return value
}
