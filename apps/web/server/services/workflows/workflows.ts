import type { Workflow } from '@datagate/shared'

export const defaultQualityGateWorkflow: Workflow = {
  id: 'default-quality-gate',
  title: 'Default Quality Gate',
  description: 'Runs the built-in deterministic checks for schema, completeness, privacy, and outliers.',
  taskIds: [
    'datagate:profile:schema',
    'datagate:profile:completeness',
    'datagate:profile:pii',
    'datagate:profile:outliers'
  ]
}

export const builtInWorkflows = [
  defaultQualityGateWorkflow
] as const

export function getWorkflow(workflowId: string): Workflow | undefined {
  return builtInWorkflows.find(workflow => workflow.id === workflowId)
}
