import type { Artifact } from '@datagate/shared'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { dataRoot } from '../datasets/storage'

export const artifactsDir = join(dataRoot, 'artifacts')

type StoreReportArtifactInput = {
  datasetId: string
  title: string
  content: string
  now?: () => Date
  createId?: () => string
  storageDir?: string
}

export async function storeReportArtifact(input: StoreReportArtifactInput): Promise<Artifact> {
  const now = input.now ?? (() => new Date())
  const createId = input.createId ?? (() => crypto.randomUUID())
  const timestamp = now().toISOString()
  const artifact: Artifact = {
    id: createId(),
    type: 'report',
    title: input.title,
    datasetId: input.datasetId,
    content: input.content,
    createdAt: timestamp,
    updatedAt: timestamp
  }
  const storageDir = input.storageDir ?? artifactsDir

  await mkdir(storageDir, { recursive: true })
  await writeFile(artifactPath(storageDir, artifact.id), `${JSON.stringify(artifact, null, 2)}\n`)

  return artifact
}

export async function getArtifact(id: string, storageDir = artifactsDir): Promise<Artifact> {
  validateArtifactId(id)

  try {
    const content = await readFile(artifactPath(storageDir, id), 'utf8')
    return JSON.parse(content) as Artifact
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Artifact not found'
      })
    }

    throw error
  }
}

function artifactPath(storageDir: string, id: string) {
  validateArtifactId(id)

  return join(storageDir, `${id}.json`)
}

function validateArtifactId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid artifact id'
    })
  }
}
