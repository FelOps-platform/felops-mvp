import { notFound } from 'next/navigation'
import { getWorkspaceBySlug } from '@felops/core/workspaces'
import { findAgentBySlug } from '@felops/db/repositories/agents'
import { ChatSurface } from '@/components/chat/chat-surface'

export const dynamic = 'force-dynamic'

export default async function HostedChatPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; agentSlug: string }>
}) {
  const { workspaceSlug, agentSlug } = await params
  const workspace = await getWorkspaceBySlug(workspaceSlug)
  if (!workspace) notFound()
  const agent = await findAgentBySlug({ workspaceId: workspace.id, slug: agentSlug })
  if (!agent || agent.status !== 'active') notFound()

  const rtl = agent.language.startsWith('ar') || agent.language === 'auto'

  return (
    <main className="flex min-h-screen flex-col bg-neutral-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-3 flex items-center justify-between px-1" dir={rtl ? 'rtl' : 'ltr'}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {workspace.name}
            </p>
            <h1 className="text-lg font-semibold text-neutral-900">
              {rtl ? 'كلمنا' : 'Chat with us'}
            </h1>
          </div>
          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-medium text-neutral-500">
            {rtl ? 'عربي · إنجليزي' : 'AR · EN'}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <ChatSurface
            publicKey={agent.publicKey}
            agentName={agent.name}
            greeting={agent.greeting}
            language={agent.language}
            accent={agent.theme?.accent ?? '#FA6400'}
            rtl={rtl}
          />
        </div>
      </div>
    </main>
  )
}
