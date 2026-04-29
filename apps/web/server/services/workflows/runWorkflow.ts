import type { Finding, ToolResult, Workflow, WorkflowRunResult, WorkflowRunSummary } from '@datagate/shared'
import { getWorkflow } from './workflows'

type DatasetTaskPayload = {
  datasetId: string
}

type NitroTaskResult = ToolResult | { result: ToolResult }

export type WorkflowTaskRunner = (taskId: string, payload: DatasetTaskPayload) => Promise<NitroTaskResult>

type RunWorkflowOptions = {
  taskRunner?: WorkflowTaskRunner
  now?: () => Date
  createId?: () => string
}

export async function runWorkflow(
  workflowId: string,
  datasetId: string,
  options: RunWorkflowOptions = {}
): Promise<WorkflowRunResult> {
  const workflow = getWorkflow(workflowId)

  if (!workflow) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Workflow not found'
    })
  }

  return runConfiguredWorkflow(workflow, datasetId, options)
}

export async function runConfiguredWorkflow(
  workflow: Workflow,
  datasetId: string,
  options: RunWorkflowOptions = {}
): Promise<WorkflowRunResult> {
  const taskRunner = options.taskRunner ?? runNitroTask
  const now = options.now ?? (() => new Date())
  const createId = options.createId ?? (() => crypto.randomUUID())
  const startedAt = now().toISOString()
  const taskResults: ToolResult[] = []

  for (const taskId of workflow.taskIds) {
    const taskResult = await taskRunner(taskId, { datasetId })
    taskResults.push(normalizeTaskResult(taskResult))
  }

  const completedAt = now().toISOString()

  return createWorkflowRunResult({
    id: createId(),
    workflow,
    datasetId,
    startedAt,
    completedAt,
    taskResults
  })
}

export function createWorkflowRunResult(input: {
  id: string
  workflow: Workflow
  datasetId: string
  startedAt: string
  completedAt: string
  taskResults: ToolResult[]
}): WorkflowRunResult {
  const findings = input.taskResults.flatMap(result => result.findings)

  return {
    id: input.id,
    workflowId: input.workflow.id,
    datasetId: input.datasetId,
    status: 'completed',
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    taskResults: input.taskResults,
    findings,
    summary: summarizeFindings(findings)
  }
}

export function summarizeFindings(findings: Finding[]): WorkflowRunSummary {
  return {
    totalFindings: findings.length,
    criticalFindings: findings.filter(finding => finding.severity === 'critical').length,
    highFindings: findings.filter(finding => finding.severity === 'high').length,
    mediumFindings: findings.filter(finding => finding.severity === 'medium').length,
    lowFindings: findings.filter(finding => finding.severity === 'low').length,
    infoFindings: findings.filter(finding => finding.severity === 'info').length
  }
}

function normalizeTaskResult(taskResult: NitroTaskResult): ToolResult {
  if ('result' in taskResult) {
    return taskResult.result
  }

  return taskResult
}

function runNitroTask(taskId: string, payload: DatasetTaskPayload): Promise<NitroTaskResult> {
  return runTask(taskId, { payload }) as Promise<NitroTaskResult>
}
