import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { getArtifact, storeReportArtifact } from './artifactStore'

const artifactId = '11111111-1111-4111-8111-111111111111'
let tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.map(dir => rm(dir, { recursive: true, force: true })))
  tempDirs = []
})

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'datagate-artifacts-'))
  tempDirs.push(dir)

  return dir
}

describe('artifact store', () => {
  it('persists and reads report artifacts', async () => {
    const storageDir = await createTempDir()
    const artifact = await storeReportArtifact({
      datasetId: 'dataset-1',
      title: 'Data Gate Quality Report',
      content: '# Report\n',
      storageDir,
      createId: () => artifactId,
      now: () => new Date('2026-01-01T00:00:00.000Z')
    })

    await expect(getArtifact(artifactId, storageDir)).resolves.toEqual(artifact)
    expect(artifact).toEqual({
      id: artifactId,
      type: 'report',
      title: 'Data Gate Quality Report',
      datasetId: 'dataset-1',
      content: '# Report\n',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
  })
})
