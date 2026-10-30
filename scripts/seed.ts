import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import {
  action,
  actionRun,
  agent,
  auditEvent,
  conversation,
  db,
  invitation,
  knowledgeChunk,
  knowledgeSource,
  membership,
  message,
  usageCounter,
  user,
  workspace,
} from '@felops/db'
import { account, session } from '@felops/db/schema'
import { replaceSourceChunks } from '@felops/db/repositories/chunks'
import { chunkDocument, embedTexts } from '@felops/ai'
import { recordAudit } from '@felops/core/audit'
import { recordIngestion, recordMessage } from '@felops/core/usage'
import { setSourceStatus } from '@felops/core/knowledge'
import { auth } from '../apps/web/src/lib/auth'

config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const DEMO_EMAIL = 'owner@cairothreads.test'
const DEMO_PASSWORD = 'demo-password'
const DEMO_SLUG = 'cairo-threads'

async function deleteWorkspaceData(workspaceId: string) {
  await db.delete(knowledgeChunk).where(eq(knowledgeChunk.workspaceId, workspaceId))
  await db.delete(knowledgeSource).where(eq(knowledgeSource.workspaceId, workspaceId))
  await db.delete(actionRun).where(eq(actionRun.workspaceId, workspaceId))
  await db.delete(action).where(eq(action.workspaceId, workspaceId))
  await db.delete(message).where(eq(message.workspaceId, workspaceId))
  await db.delete(conversation).where(eq(conversation.workspaceId, workspaceId))
  await db.delete(auditEvent).where(eq(auditEvent.workspaceId, workspaceId))
  await db.delete(usageCounter).where(eq(usageCounter.workspaceId, workspaceId))
  await db.delete(invitation).where(eq(invitation.workspaceId, workspaceId))
  await db.delete(agent).where(eq(agent.workspaceId, workspaceId))
  await db.delete(membership).where(eq(membership.workspaceId, workspaceId))
  await db.delete(workspace).where(eq(workspace.id, workspaceId))
}

async function cleanupDemoTenant() {
  const existingUser = await db.select().from(user).where(eq(user.email, DEMO_EMAIL)).limit(1)
  if (existingUser[0]) {
    const memberships = await db
      .select()
      .from(membership)
      .where(eq(membership.userId, existingUser[0].id))
    for (const row of memberships) {
      await deleteWorkspaceData(row.workspaceId)
    }
    await db.delete(membership).where(eq(membership.userId, existingUser[0].id))
    await db.delete(session).where(eq(session.userId, existingUser[0].id))
    await db.delete(account).where(eq(account.userId, existingUser[0].id))
    await db.delete(user).where(eq(user.id, existingUser[0].id))
  }
  const existingWorkspace = await db
    .select()
    .from(workspace)
    .where(eq(workspace.slug, DEMO_SLUG))
    .limit(1)
  if (existingWorkspace[0]) {
    await deleteWorkspaceData(existingWorkspace[0].id)
  }
}

async function main() {
  console.log('Seeding the Cairo Threads demo tenant…')
  await cleanupDemoTenant()

  const signUp = await auth.api.signUpEmail({
    body: { name: 'Maya Hassan', email: DEMO_EMAIL, password: DEMO_PASSWORD },
  })
  const userId = signUp.user.id
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId))

  const [ws] = await db
    .insert(workspace)
    .values({ name: 'Cairo Threads', slug: DEMO_SLUG, plan: 'free' })
    .returning()
  await db.insert(membership).values({ userId, workspaceId: ws.id, role: 'owner' })

  const [support] = await db
    .insert(agent)
    .values({
      workspaceId: ws.id,
      name: 'Support',
      slug: 'support',
      status: 'active',
      greeting: 'أهلاً بيك في Cairo Threads! أقدر أساعدك في الشحن، الاسترجاع، أو مواعيد العمل؟',
      language: 'ar+en',
      publicKey: 'pk_demo_cairo_threads',
      allowedOrigins: ['http://localhost:5174', 'http://localhost:3000'],
      theme: { accent: '#FA6400' },
      instructions: {
        role: 'Answer customer questions about shipping, returns, store hours, and product availability for an Egyptian clothing store.',
        language: 'ar+en',
        constraints:
          'Never invent prices, delivery dates, or refund eligibility. Never promise an action before it is approved.',
        responseFormat: 'Two or three short sentences, matching the customer language, with a citation.',
      },
    })
    .returning()
  await recordAudit({
    workspaceId: ws.id,
    actorId: userId,
    type: 'agent.created',
    targetType: 'agent',
    targetId: support.id,
    data: { name: support.name },
  })

  const sources = [
    {
      title: 'Shipping and delivery',
      text: [
        '# الشحن والتوصيل',
        '',
        'الشحن بياخد كام يوم؟ الشحن بياخد 3 أيام عمل داخل القاهرة والجيزة، و5 أيام عمل لباقي المحافظات.',
        '',
        'Shipping takes 3 business days inside Cairo and Giza, and 5 business days elsewhere in Egypt.',
        '',
        'الشحن مجاني للأوردرات فوق 1500 جنيه.',
      ].join('\n'),
    },
    {
      title: 'Returns and refunds',
      text: [
        '# الاسترجاع والاستبدال',
        '',
        'عايزة أرجّع الأوردر؟ يمكن الاسترجاع خلال 14 يوم من الاستلام بشرط أن يكون المنتج بحالته الأصلية والبطاقة موجودة.',
        '',
        'Returns are accepted within 14 days of delivery. Refunds are reviewed by a team member before they are issued.',
        '',
        'الاستبدال متاح خلال 30 يوم في الفرع.',
      ].join('\n'),
    },
    {
      title: 'Store hours and location',
      text: [
        '# مواعيد العمل',
        '',
        'مواعيد العمل من السبت للخميس، من 10 صباحاً لـ 10 مساءً. الجمعة من 2 العصر لـ 10 مساءً.',
        '',
        'We are open Saturday to Thursday, 10:00–22:00, and Friday 14:00–22:00.',
        '',
        'الفرع في مدينة نصر، شارع عباس العقاد.',
      ].join('\n'),
    },
  ]

  for (const source of sources) {
    const [row] = await db
      .insert(knowledgeSource)
      .values({
        workspaceId: ws.id,
        agentId: support.id,
        type: 'text',
        title: source.title,
        rawText: source.text,
        status: 'processing',
      })
      .returning()
    const chunks = chunkDocument({ title: source.title, text: source.text })
    const vectors = await embedTexts(chunks.map((chunk) => chunk.content))
    await replaceSourceChunks({
      workspaceId: ws.id,
      agentId: support.id,
      sourceId: row.id,
      chunks: chunks.map((chunk, index) => ({
        content: chunk.content,
        embedding: vectors[index],
        tokenCount: chunk.tokenCount,
        heading: chunk.heading ?? null,
      })),
    })
    await setSourceStatus({
      workspaceId: ws.id,
      sourceId: row.id,
      status: 'ready',
      chunkCount: chunks.length,
    })
    await recordIngestion(ws.id)
  }

  const [refund] = await db
    .insert(action)
    .values({
      workspaceId: ws.id,
      agentId: support.id,
      name: 'Request refund',
      description: 'Ask the store team to review and issue a refund for an order.',
      method: 'POST',
      urlTemplate: 'https://httpbin.org/post',
      bodyTemplate: '{"reason":"{{reason}}"}',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why the customer wants a refund' },
        },
        required: ['reason'],
        additionalProperties: false,
      },
      approvalRequired: true,
      enabled: true,
    })
    .returning()

  const [openConversation] = await db
    .insert(conversation)
    .values({
      workspaceId: ws.id,
      agentId: support.id,
      channel: 'playground',
      visitorId: 'visitor_mariam',
      status: 'open',
      lastMessageAt: new Date(),
    })
    .returning()

  await db.insert(message).values([
    {
      conversationId: openConversation.id,
      workspaceId: ws.id,
      role: 'user',
      authorType: 'customer',
      content: 'عايزة أرجّع الأوردر، الجاكيت مقاسه غلط.',
    },
    {
      conversationId: openConversation.id,
      workspaceId: ws.id,
      role: 'assistant',
      authorType: 'ai',
      content:
        'معلش على الإزعاج! الاسترجاع متاح خلال 14 يوم من الاستلام بشرط أن يكون المنتج بحالته الأصلية. [1]',
      citations: [
        {
          index: 1,
          sourceId: 'seed-returns',
          title: 'Returns and refunds',
          snippet: 'Returns are accepted within 14 days of delivery.',
        },
      ],
      model: 'gpt-4.1-mini',
    },
    {
      conversationId: openConversation.id,
      workspaceId: ws.id,
      role: 'system',
      authorType: 'system',
      content: 'Action is waiting for approval',
    },
  ])

  const pendingRunId = crypto.randomUUID()
  await db.insert(actionRun).values({
    id: pendingRunId,
    workspaceId: ws.id,
    agentId: support.id,
    actionId: refund.id,
    conversationId: openConversation.id,
    status: 'pending',
    args: { reason: 'Wrong size jacket, requested within 7 days' },
    idempotencyKey: pendingRunId,
  })
  await recordAudit({
    workspaceId: ws.id,
    actorId: 'agent',
    type: 'action_run.requested',
    targetType: 'action_run',
    targetId: pendingRunId,
    data: { actionId: refund.id, status: 'pending' },
  })

  const succeededRunId = crypto.randomUUID()
  await db.insert(actionRun).values({
    id: succeededRunId,
    workspaceId: ws.id,
    agentId: support.id,
    actionId: refund.id,
    conversationId: openConversation.id,
    status: 'succeeded',
    args: { reason: 'Damaged item on arrival' },
    request: { method: 'POST', url: 'https://httpbin.org/post', body: '{"reason":"Damaged item"}' },
    response: { status: 200, body: '{"ok":true}' },
    approvedBy: userId,
    approvedAt: new Date(Date.now() - 1000 * 60 * 30),
    idempotencyKey: succeededRunId,
    attempts: 1,
    finishedAt: new Date(Date.now() - 1000 * 60 * 29),
  })

  const [humanConversation] = await db
    .insert(conversation)
    .values({
      workspaceId: ws.id,
      agentId: support.id,
      channel: 'widget',
      visitorId: 'visitor_omar',
      status: 'human',
      assignedTo: userId,
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
    })
    .returning()
  await db.insert(message).values([
    {
      conversationId: humanConversation.id,
      workspaceId: ws.id,
      role: 'user',
      authorType: 'customer',
      content: 'أنا محتاج أعدل العنوان بعد ما الأوردر اتشحن.',
    },
    {
      conversationId: humanConversation.id,
      workspaceId: ws.id,
      role: 'assistant',
      authorType: 'human',
      content: 'أهلاً عمر، أنا سارة من فريق Cairo Threads. هعدل العنوان مع شركة الشحن وأرجعلك.',
    },
  ])

  await recordMessage(ws.id, 12)
  await recordAudit({
    workspaceId: ws.id,
    actorId: userId,
    type: 'action_run.approved',
    targetType: 'action_run',
    targetId: succeededRunId,
    data: { status: 'approved', seeded: true },
  })

  console.log('Seed complete.')
  console.log(`  email:    ${DEMO_EMAIL}`)
  console.log(`  password: ${DEMO_PASSWORD}`)
  console.log(`  workspace /w/${DEMO_SLUG}`)
  console.log(`  hosted:   /chat/${DEMO_SLUG}/support`)
  console.log(`  widget:   pk_demo_cairo_threads`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
