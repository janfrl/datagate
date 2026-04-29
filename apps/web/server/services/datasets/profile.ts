import type { ColumnProfile, DatasetProfile } from '@datagate/shared'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataset, profilesDir } from './storage'

type CsvRow = string[]
type InferredType = ColumnProfile['inferredType']
type NormalizedHeader = Pick<ColumnProfile, 'name' | 'originalName' | 'wasGeneratedName' | 'wasDuplicateName'>

const sampleRowLimit = 20
const exampleLimit = 5

export async function getDatasetProfile(datasetId: string): Promise<DatasetProfile> {
  validateDatasetId(datasetId)

  const profilePath = join(profilesDir, `${datasetId}.json`)

  try {
    const content = await readFile(profilePath, 'utf8')
    const profile = JSON.parse(content) as DatasetProfile

    if (profileHasHeaderMetadata(profile)) {
      return profile
    }
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

export async function getDatasetRows(datasetId: string): Promise<Record<string, unknown>[]> {
  validateDatasetId(datasetId)

  const dataset = await getDataset(datasetId)
  const parsedRows = parseCsv(await readFile(dataset.storagePath, 'utf8'))

  if (parsedRows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV file does not contain a header row'
    })
  }

  const headers = normalizeHeaders(parsedRows[0]!)

  return parsedRows.slice(1).map(row => rowToRecord(headers.map(header => header.name), row))
}

export function profileCsv(datasetId: string, csv: string): DatasetProfile {
  const parsedRows = parseCsv(csv)

  if (parsedRows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV file does not contain a header row'
    })
  }

  const headers = normalizeHeaders(parsedRows[0]!)
  const rows = parsedRows.slice(1)
  const headerNames = headers.map(header => header.name)
  const sampleRows = rows.slice(0, sampleRowLimit).map(row => rowToRecord(headerNames, row))
  const columns = headers.map((header, index) => profileColumn(header, rows, index))

  return {
    datasetId,
    rowCount: rows.length,
    columnCount: headers.length,
    columns,
    sampleRows
  }
}

function profileColumn(header: NormalizedHeader, rows: CsvRow[], index: number): ColumnProfile {
  const values = rows.map(row => row[index] ?? '')
  const presentValues = values.map(value => value.trim()).filter(value => value.length > 0)
  const inferredType = inferColumnType(presentValues)
  const missingCount = values.length - presentValues.length
  const uniqueValues = new Set(presentValues)

  return {
    name: header.name,
    originalName: header.originalName,
    wasGeneratedName: header.wasGeneratedName,
    wasDuplicateName: header.wasDuplicateName,
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

function normalizeHeaders(headers: CsvRow): NormalizedHeader[] {
  const seenOriginalNames = new Map<string, number>()
  const safeNameCounts = new Map<string, number>()
  const usedSafeNames = new Set<string>()

  return headers.map((header, index) => {
    const originalName = header.trim()
    const fallback = `column_${index + 1}`
    const baseSafeName = originalName || fallback
    const originalSeenCount = seenOriginalNames.get(originalName) ?? 0
    const safeSeenCount = safeNameCounts.get(baseSafeName) ?? 0
    let safeName = safeSeenCount === 0 ? baseSafeName : `${baseSafeName}_${safeSeenCount + 1}`

    while (usedSafeNames.has(safeName)) {
      const nextCount = (safeNameCounts.get(baseSafeName) ?? 0) + 1
      safeNameCounts.set(baseSafeName, nextCount)
      safeName = `${baseSafeName}_${nextCount + 1}`
    }

    seenOriginalNames.set(originalName, originalSeenCount + 1)
    safeNameCounts.set(baseSafeName, (safeNameCounts.get(baseSafeName) ?? 0) + 1)
    usedSafeNames.add(safeName)

    return {
      name: safeName,
      originalName,
      wasGeneratedName: originalName.length === 0,
      wasDuplicateName: originalSeenCount > 0
    }
  })
}

function profileHasHeaderMetadata(profile: DatasetProfile) {
  return profile.columns.every(column => (
    typeof column.originalName === 'string'
    && typeof column.wasGeneratedName === 'boolean'
    && typeof column.wasDuplicateName === 'boolean'
  ))
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
