import type { Dataset } from '@datagate/shared'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type UploadedDatasetFile = {
  filename?: string
  type?: string
  data: Buffer
}

const dataRoot = join(process.cwd(), '.data', 'datagate')
const uploadsDir = join(dataRoot, 'uploads')
const datasetsDir = join(dataRoot, 'datasets')

const csvMimeTypes = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel'
])

export async function storeUploadedCsvDataset(file?: UploadedDatasetFile): Promise<Dataset> {
  validateUploadedCsv(file)

  const id = crypto.randomUUID()
  const uploadedAt = new Date().toISOString()
  const filename = file.filename!
  const storagePath = join(uploadsDir, `${id}.csv`)

  await ensureDatasetDirectories()
  await writeFile(storagePath, file.data)

  const dataset: Dataset = {
    id,
    filename,
    mimeType: file.type || 'text/csv',
    size: file.data.byteLength,
    uploadedAt,
    storagePath
  }

  await writeFile(
    join(datasetsDir, `${id}.json`),
    `${JSON.stringify(dataset, null, 2)}\n`
  )

  return dataset
}

export async function listDatasets(): Promise<Dataset[]> {
  await ensureDatasetDirectories()

  const entries = await readdir(datasetsDir, { withFileTypes: true })
  const datasets = await Promise.all(
    entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const content = await readFile(join(datasetsDir, entry.name), 'utf8')
        return JSON.parse(content) as Dataset
      })
  )

  return datasets.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

async function ensureDatasetDirectories() {
  await mkdir(uploadsDir, { recursive: true })
  await mkdir(datasetsDir, { recursive: true })
}

function validateUploadedCsv(file?: UploadedDatasetFile): asserts file is UploadedDatasetFile & { filename: string } {
  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV file is required'
    })
  }

  if (!file.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Uploaded file must include a filename'
    })
  }

  if (file.data.byteLength === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Uploaded CSV file must not be empty'
    })
  }

  if (!isCsvFile(file)) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Only CSV files are supported'
    })
  }
}

function isCsvFile(file: UploadedDatasetFile) {
  const type = file.type?.toLowerCase()
  const hasCsvMimeType = type ? csvMimeTypes.has(type) : false
  const hasCsvExtension = file.filename?.toLowerCase().endsWith('.csv') ?? false

  return hasCsvMimeType || hasCsvExtension
}
