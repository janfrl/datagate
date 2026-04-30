import { db, schema } from 'hub:db'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { toPublicDataset } from '../../services/datasets/datasetResponses'
import { getDataset } from '../../services/datasets/storage'
import { devtoolsHighLevelTools } from '../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

export default defineEventHandler(async (event) => {
  assertDataGateDevtoolsEnabled()

  const query = await getValidatedQuery(event, z.object({
    chatId: z.string().optional()
  }).parse)

  if (!query.chatId) {
    return {
      chatId: null,
      activeDataset: null,
      context: {
        activeDataset: null,
        toolNames: devtoolsHighLevelTools.map(tool => tool.id),
        rawDatasetRowsIncluded: false
      }
    }
  }

  const chat = await db.query.chats.findFirst({
    where: () => eq(schema.chats.id, query.chatId as string),
    with: {
      messages: {
        orderBy: () => asc(schema.messages.createdAt)
      }
    }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    })
  }

  const activeDataset = chat.activeDatasetId
    ? toPublicDataset(await getDataset(chat.activeDatasetId))
    : null

  return {
    chatId: chat.id,
    activeDataset,
    context: {
      activeDataset,
      toolNames: devtoolsHighLevelTools.map(tool => tool.id),
      messageCount: chat.messages.length,
      messages: chat.messages.map(message => ({
        id: message.id,
        role: message.role,
        partTypes: getMessagePartTypes(message.parts),
        createdAt: message.createdAt
      })),
      rawDatasetRowsIncluded: false
    }
  }
})

function getMessagePartTypes(parts: unknown) {
  return Array.isArray(parts)
    ? parts.map(part => part && typeof part === 'object' && 'type' in part ? String(part.type) : typeof part)
    : []
}
