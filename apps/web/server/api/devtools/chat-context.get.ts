import { db, schema } from 'hub:db'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { listArtifacts } from '../../services/artifacts/artifactStore'
import { toPublicDataset } from '../../services/datasets/datasetResponses'
import { getDataset } from '../../services/datasets/storage'
import { devtoolsHighLevelTools } from '../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

type MessageRecord = {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: unknown
  createdAt: Date | string
}

type MessagePart = {
  type?: unknown
  text?: unknown
  toolName?: unknown
  toolCallId?: unknown
}

const maxLastUserMessagePreviewLength = 240
const maxToolCallSummaries = 12
const maxRecentChats = 10

export default defineEventHandler(async (event) => {
  assertDataGateDevtoolsEnabled()

  const session = await getUserSession(event)
  const userId = session.user?.id || session.id

  const query = await getValidatedQuery(event, z.object({
    chatId: z.string().optional()
  }).parse)

  const recentChats = userId
    ? await db.query.chats.findMany({
        where: () => eq(schema.chats.userId, userId),
        orderBy: () => desc(schema.chats.createdAt),
        limit: maxRecentChats
      })
    : []

  const recentChatSummaries = recentChats.map(chat => ({
    id: chat.id,
    title: chat.title || 'Untitled chat',
    activeDatasetId: chat.activeDatasetId,
    createdAt: typeof chat.createdAt === 'string' ? chat.createdAt : new Date(chat.createdAt).toISOString()
  }))

  if (!query.chatId) {
    return {
      chatId: null,
      activeDataset: null,
      recentChats: recentChatSummaries,
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

  const messageList = (chat.messages || []) as MessageRecord[]
  const lastUserMessage = [...messageList].reverse().find(message => message.role === 'user')
  const lastUserMessagePreview = lastUserMessage ? extractTextPreview(lastUserMessage.parts) : null
  const toolCalls = collectToolCalls(messageList).slice(-maxToolCallSummaries)
  const errors = collectErrorParts(messageList)

  const datasetArtifacts = chat.activeDatasetId
    ? (await safeListArtifacts()).filter(artifact => artifact.datasetId === chat.activeDatasetId)
    : []

  return {
    chatId: chat.id,
    activeDataset,
    recentChats: recentChatSummaries,
    context: {
      activeDataset,
      toolNames: devtoolsHighLevelTools.map(tool => tool.id),
      messageCount: messageList.length,
      messages: messageList.map(message => ({
        id: message.id,
        role: message.role,
        partTypes: getMessagePartTypes(message.parts),
        createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString()
      })),
      lastUserMessagePreview,
      toolCalls,
      errors,
      generatedArtifacts: datasetArtifacts.slice(0, 5).map(artifact => ({
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        createdAt: artifact.createdAt
      })),
      rawDatasetRowsIncluded: false
    }
  }
})

function getMessagePartTypes(parts: unknown) {
  return Array.isArray(parts)
    ? parts.map(part => part && typeof part === 'object' && 'type' in part ? String((part as MessagePart).type) : typeof part)
    : []
}

function extractTextPreview(parts: unknown) {
  if (!Array.isArray(parts)) return null

  const text = parts
    .map((part) => {
      if (part && typeof part === 'object') {
        const typed = part as MessagePart
        if (typed.type === 'text' && typeof typed.text === 'string') {
          return typed.text
        }
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
    .trim()

  if (!text) return null
  if (text.length <= maxLastUserMessagePreviewLength) return text
  return `${text.slice(0, maxLastUserMessagePreviewLength).trimEnd()}…`
}

function collectToolCalls(messages: MessageRecord[]) {
  const calls: Array<{
    messageId: string
    toolName: string
    type: string
    createdAt: string
  }> = []

  for (const message of messages) {
    if (!Array.isArray(message.parts)) continue
    for (const part of message.parts) {
      if (!part || typeof part !== 'object') continue
      const typed = part as MessagePart
      const type = typeof typed.type === 'string' ? typed.type : ''
      if (!type.startsWith('tool-') && type !== 'tool-call' && type !== 'tool-result') continue

      const inferredName = type.startsWith('tool-') && type !== 'tool-call' && type !== 'tool-result'
        ? type.slice('tool-'.length)
        : (typeof typed.toolName === 'string' ? typed.toolName : 'unknown')

      calls.push({
        messageId: message.id,
        toolName: inferredName,
        type,
        createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString()
      })
    }
  }

  return calls
}

function collectErrorParts(messages: MessageRecord[]) {
  const errors: Array<{ messageId: string, type: string, createdAt: string }> = []

  for (const message of messages) {
    if (!Array.isArray(message.parts)) continue
    for (const part of message.parts) {
      if (!part || typeof part !== 'object') continue
      const typed = part as MessagePart
      const type = typeof typed.type === 'string' ? typed.type : ''
      if (type === 'error' || type.endsWith('-error')) {
        errors.push({
          messageId: message.id,
          type,
          createdAt: typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString()
        })
      }
    }
  }

  return errors
}

async function safeListArtifacts() {
  try {
    return await listArtifacts()
  } catch {
    return []
  }
}
