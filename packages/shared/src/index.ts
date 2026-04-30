export type Dataset = {
  id: string
  filename: string
  mimeType: string
  size: number
  uploadedAt: string
  storagePath: string
}

export type PublicDataset = Pick<Dataset, 'id' | 'filename' | 'mimeType' | 'size' | 'uploadedAt'>

export type DatasetProfile = {
  datasetId: string
  rowCount: number
  columnCount: number
  columns: ColumnProfile[]
  sampleRows: Record<string, unknown>[]
}

export type ColumnProfile = {
  name: string
  originalName?: string
  wasGeneratedName?: boolean
  wasDuplicateName?: boolean
  inferredType: 'string' | 'number' | 'boolean' | 'date' | 'unknown'
  missingCount: number
  missingRatio: number
  uniqueCount: number
  examples: unknown[]
}

export type PublicColumnProfile = Omit<ColumnProfile, 'examples'>

export type PublicDatasetProfile = Omit<DatasetProfile, 'columns' | 'sampleRows'> & {
  columns: PublicColumnProfile[]
}

export type Finding = {
  id: string
  category: 'schema' | 'completeness' | 'privacy' | 'outliers' | 'readiness'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  column?: string
  title: string
  message: string
  recommendation: string
  evidence?: unknown
}

export type ToolResult = {
  toolId: string
  findings: Finding[]
  scoreImpact: number
}

export type Workflow = {
  id: string
  title: string
  description: string
  taskIds: string[]
}

export type WorkflowRunStatus = 'completed' | 'failed'

export type WorkflowRunSummary = {
  totalFindings: number
  criticalFindings: number
  highFindings: number
  mediumFindings: number
  lowFindings: number
  infoFindings: number
}

export type QualityScoreBreakdownItem = {
  category: Finding['category']
  score: number
  maxScore: number
  impact: number
  findingCount: number
}

export type QualityScore = {
  score: number
  maxScore: number
  breakdown: QualityScoreBreakdownItem[]
}

export type WorkflowRunResult = {
  id: string
  workflowId: string
  datasetId: string
  status: WorkflowRunStatus
  startedAt: string
  completedAt: string
  taskResults: ToolResult[]
  findings: Finding[]
  summary: WorkflowRunSummary
  qualityScore: QualityScore
  artifacts?: {
    report?: string
  }
}

export type SafeFindingSummary = Pick<Finding, 'id' | 'category' | 'severity' | 'column' | 'title' | 'message' | 'recommendation'>

export type SafeWorkflowRunSummary = {
  workflowRunId: string
  datasetId: string
  status: WorkflowRunStatus
  qualityScore: QualityScore
  severityCounts: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  topFindings: SafeFindingSummary[]
  recommendations: string[]
  reportArtifactId?: string
}

export type Artifact = {
  id: string
  type: 'dataset-profile' | 'findings' | 'report'
  title: string
  datasetId?: string
  chatId?: string
  content: unknown
  createdAt: string
  updatedAt: string
}

export type SafeArtifactContent = {
  id: string
  type: Artifact['type']
  title: string
  datasetId?: string
  createdAt: string
  updatedAt: string
  content: string
  truncated: boolean
}
