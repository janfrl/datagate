import { db, schema } from 'hub:db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { toPublicDataset } from '../../../services/datasets/datasetResponses'
import { getDataset } from '../../../services/datasets/storage'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string()
  }).parse)

  const { datasetId } = await readValidatedBody(event, z.object({
    datasetId: z.string().uuid()
  }).parse)

  const dataset = await getDataset(datasetId)
  const userId = session.user?.id || session.id

  const [chat] = await db.update(schema.chats)
    .set({ activeDatasetId: dataset.id })
    .where(and(
      eq(schema.chats.id, id),
      eq(schema.chats.userId, userId)
    ))
    .returning()

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  return {
    activeDataset: toPublicDataset(dataset)
  }
})
