import type { Finding, ToolResult } from '@datagate/shared'
import { describe, expect, it } from 'vitest'
import { createWorkflowRunResult, runConfiguredWorkflow, summarizeFindings } from './runWorkflow'
import { defaultQualityGateWorkflow } from './workflows'

function finding(id: string, severity: Finding['severity']): Finding {
  return {
    id,
    category: 'schema',
    severity,
    title: `${severity} finding`,
    message: `${severity} message`,
    recommendation: `${severity} recommendation`
  }
}

function toolResult(toolId: string, findings: Finding[]): ToolResult {
  return {
    toolId,
    findings,
    scoreImpact: findings.length
  }
}

describe('workflow runner', () => {
  it('defines the built-in Default Quality Gate task order', () => {
    expect(defaultQualityGateWorkflow).toMatchObject({
      id: 'default-quality-gate',
      title: 'Default Quality Gate',
      taskIds: [
        'datagate:profile:schema',
        'datagate:profile:completeness',
        'datagate:profile:pii',
        'datagate:profile:outliers'
      ]
    })
  })

  it('runs tasks in workflow order and preserves task result order', async () => {
    const calls: string[] = []
    const result = await runConfiguredWorkflow(defaultQualityGateWorkflow, 'dataset-1', {
      createId: () => 'run-1',
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      async taskRunner(taskId, payload) {
        calls.push(`${taskId}:${payload.datasetId}`)

        return {
          result: toolResult(taskId, [])
        }
      }
    })

    expect(calls).toEqual(defaultQualityGateWorkflow.taskIds.map(taskId => `${taskId}:dataset-1`))
    expect(result.taskResults.map(taskResult => taskResult.toolId)).toEqual(defaultQualityGateWorkflow.taskIds)
    expect(result).toMatchObject({
      id: 'run-1',
      workflowId: 'default-quality-gate',
      datasetId: 'dataset-1',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.000Z'
    })
  })

  it('normalizes direct ToolResult task responses', async () => {
    const result = await runConfiguredWorkflow({
      ...defaultQualityGateWorkflow,
      taskIds: ['datagate:profile:schema']
    }, 'dataset-1', {
      createId: () => 'run-1',
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      async taskRunner(taskId) {
        return toolResult(taskId, [finding('high-1', 'high')])
      }
    })

    expect(result.taskResults).toEqual([
      toolResult('datagate:profile:schema', [finding('high-1', 'high')])
    ])
    expect(result.findings).toEqual([
      finding('high-1', 'high')
    ])
  })

  it('flattens findings and counts severities', () => {
    const result = createWorkflowRunResult({
      id: 'run-1',
      workflow: defaultQualityGateWorkflow,
      datasetId: 'dataset-1',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
      taskResults: [
        toolResult('datagate:profile:schema', [
          finding('critical-1', 'critical'),
          finding('high-1', 'high')
        ]),
        toolResult('datagate:profile:completeness', [
          finding('medium-1', 'medium')
        ]),
        toolResult('datagate:profile:pii', [
          finding('low-1', 'low'),
          finding('info-1', 'info')
        ])
      ]
    })

    expect(result.findings.map(item => item.id)).toEqual([
      'critical-1',
      'high-1',
      'medium-1',
      'low-1',
      'info-1'
    ])
    expect(result.summary).toEqual({
      totalFindings: 5,
      criticalFindings: 1,
      highFindings: 1,
      mediumFindings: 1,
      lowFindings: 1,
      infoFindings: 1
    })
  })

  it('returns zero counts when no findings exist', () => {
    expect(summarizeFindings([])).toEqual({
      totalFindings: 0,
      criticalFindings: 0,
      highFindings: 0,
      mediumFindings: 0,
      lowFindings: 0,
      infoFindings: 0
    })
  })
})
