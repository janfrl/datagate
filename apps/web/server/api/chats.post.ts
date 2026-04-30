import type { UIMessage } from 'ai'
import { db, schema } from 'hub:db'
import { z } from 'zod'
import { getDataset } from '../services/datasets/storage'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const { activeDatasetId, id, message } = await readValidatedBody(event, z.object({
    id: z.string(),
    activeDatasetId: z.string().uuid().optional(),
    message: z.custom<UIMessage>()
  }).parse)

  if (activeDatasetId) {
    await getDataset(activeDatasetId)
  }

  const [chat] = await db.insert(schema.chats).values({
    id,
    title: '',
    userId: session.user?.id || session.id,
    activeDatasetId
  }).returning()

  if (!chat) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create chat' })
  }

  await db.insert(schema.messages).values({
    id: message.id,
    chatId: chat.id,
    role: 'user',
    parts: message.parts
  })

  return chat
})
