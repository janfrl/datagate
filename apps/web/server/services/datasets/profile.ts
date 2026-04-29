import type { ColumnProfile, DatasetProfile } from '@datagate/shared'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataset, profilesDir } from './storage'

type CsvRow = string[]
type InferredType = ColumnProfile['inferredType']

const sampleRowLimit = 20
const exampleLimit = 5

export async function getDatasetProfile(datasetId: string): Promise<DatasetProfile> {
  validateDatasetId(datasetId)

  const profilePath = join(profilesDir, `${datasetId}.json`)

  try {
    const content = await readFile(profilePath, 'utf8')
    return JSON.parse(content) as DatasetProfile
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  const dataset = await getDataset(datasetId)
  const csv = await readFile(dataset.storagePath, 'utf8')
  const profile = profileCsv(datasetId, csv)

  await writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`)

  return profile
}

function profileCsv(datasetId: string, csv: string): DatasetProfile {
  const parsedRows = parseCsv(csv)

  if (parsedRows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV file does not contain a header row'
    })
  }

  const headers = normalizeHeaders(parsedRows[0]!)
  const rows = parsedRows.slice(1)
  const sampleRows = rows.slice(0, sampleRowLimit).map(row => rowToRecord(headers, row))
  const columns = headers.map((name, index) => profileColumn(name, rows, index))

  return {
    datasetId,
    rowCount: rows.length,
    columnCount: headers.length,
    columns,
    sampleRows
  }
}

function profileColumn(name: string, rows: CsvRow[], index: number): ColumnProfile {
  const values = rows.map(row => row[index] ?? '')
  const presentValues = values.map(value => value.trim()).filter(value => value.length > 0)
  const inferredType = inferColumnType(presentValues)
  const missingCount = values.length - presentValues.length
  const uniqueValues = new Set(presentValues)

  return {
    name,
    inferredType,
    missingCount,
    missingRatio: values.length === 0 ? 0 : missingCount / values.length,
    uniqueCount: uniqueValues.size,
    examples: Array.from(uniqueValues).slice(0, exampleLimit).map(value => coerceValue(value, inferredType))
  }
}

function rowToRecord(headers: string[], row: CsvRow): Record<string, unknown> {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
}

function normalizeHeaders(headers: CsvRow): string[] {
  const seen = new Map<string, number>()

  return headers.map((header, index) => {
    const fallback = `column_${index + 1}`
    const baseName = header.trim() || fallback
    const seenCount = seen.get(baseName) ?? 0
    seen.set(baseName, seenCount + 1)

    return seenCount === 0 ? baseName : `${baseName}_${seenCount + 1}`
  })
}

function inferColumnType(values: string[]): InferredType {
  if (values.length === 0) return 'unknown'
  if (values.every(isBooleanValue)) return 'boolean'
  if (values.every(isNumberValue)) return 'number'
  if (values.every(isDateValue)) return 'date'

  return 'string'
}

function coerceValue(value: string, inferredType: InferredType): unknown {
  if (inferredType === 'number') return Number(value)
  if (inferredType === 'boolean') return ['true', 'yes', '1'].includes(value.toLowerCase())

  return value
}

function isBooleanValue(value: string) {
  return ['true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())
}

function isNumberValue(value: string) {
  return value.trim() !== '' && Number.isFinite(Number(value))
}

function isDateValue(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
}

function parseCsv(csv: string): CsvRow[] {
  const rows: CsvRow[] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < csv.length; index++) {
    const char = csv[index]
    const next = csv[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        index++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index++
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter(parsedRow => parsedRow.some(value => value.trim().length > 0))
}

function validateDatasetId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid dataset id'
    })
  }
}
