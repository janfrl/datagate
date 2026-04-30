import { db, schema } from 'hub:db'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { toPublicDataset } from '../../services/datasets/datasetResponses'
import { getDataset } from '../../services/datasets/storage'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string()
  }).parse)

  const chat = await db.query.chats.findFirst({
    where: () => eq(schema.chats.id, id as string),
    with: {
      messages: {
        orderBy: () => asc(schema.messages.createdAt)
      }
    }
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  const userId = session.user?.id || session.id
  const isOwner = chat.userId === userId

  if (chat.visibility === 'private' && !isOwner) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  const activeDataset = chat.activeDatasetId
    ? toPublicDataset(await getDataset(chat.activeDatasetId))
    : null
  const { userId: _, ...rest } = chat
  return { ...rest, activeDataset, isOwner }
})
