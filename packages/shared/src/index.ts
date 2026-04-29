export type Dataset = {
  id: string
  filename: string
  mimeType: string
  size: number
  uploadedAt: string
  storagePath: string
}

export type DatasetProfile = {
  datasetId: string
  rowCount: number
  columnCount: number
  columns: ColumnProfile[]
  sampleRows: Record<string, unknown>[]
}

export type ColumnProfile = {
  name: string
  inferredType: 'string' | 'number' | 'boolean' | 'date' | 'unknown'
  missingCount: number
  missingRatio: number
  uniqueCount: number
  examples: unknown[]
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
