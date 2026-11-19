import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, desc, eq, sql } from 'drizzle-orm'
import { conversation, db, knowledgeSource } from '@felops/db'
import { findAgent } from '@felops/db/repositories/agents'
import { loadEnv } from '@felops/config'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AgentBasicsForm } from '@/components/agents/agent-basics-form'
import { BuilderStepper } from '@/components/agents/builder-stepper'
import { EmbedSnippet } from '@/components/agents/embed-snippet'
import {
  activateAgentAction,
  deleteAgentAction,
  pauseAgentAction,
  updateAgentAction,
} from '../actions'

export default async function AgentOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; agentId: string }>
  searchParams: Promise<{ error?: string; saved?: string; activated?: string; paused?: string }>
}) {
  const { workspaceSlug, agentId } = await params
  const query = await searchParams
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agent = await findAgent({ workspaceId: workspace.id, agentId })
  if (!agent) notFound()

  const [counts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.workspaceId, workspace.id),
        eq(knowledgeSource.agentId, agent.id),
        eq(knowledgeSource.status, 'ready'),
      ),
    )
  const readySources = counts?.count ?? 0

  const recent = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.workspaceId, workspace.id),
        eq(conversation.agentId, agent.id),
      ),
    )
    .orderBy(desc(conversation.lastMessageAt))
    .limit(5)

  const appUrl = loadEnv().APP_URL
  const hostedUrl = `${appUrl}/chat/${workspace.slug}/${agent.slug}`
  const snippet = `<script src="${appUrl}/widget.js" data-agent-key="${agent.publicKey}" async></script>`

  return (
    <div className="space-y-6">
      <BuilderStepper slug={workspace.slug} agentId={agent.id} active="basics" />

      {query.error === 'knowledge' ? (
        <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-sm text-[#92400E]">
          Add at least one ready knowledge source with content before activating.
        </p>
      ) : null}
      {query.saved ? (
        <p className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">
          Basics saved.
        </p>
      ) : null}
      {query.activated ? (
        <p className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">
          Agent is live. The hosted page and widget now answer customers.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardBody>
              <AgentBasicsForm
                action={updateAgentAction}
                slug={workspace.slug}
                agentId={agent.id}
                defaults={{
                  name: agent.name,
                  greeting: agent.greeting,
                  instructions: agent.instructions,
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent conversations</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {recent.length === 0 ? (
                <p className="px-5 py-6 text-sm text-neutral-500">No conversations yet.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {recent.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/w/${workspace.slug}/conversations/${item.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-neutral-50"
                      >
                        <span>#{item.id.slice(0, 8)} · {item.channel}</span>
                        <span className="text-xs text-neutral-400">
                          {formatRelativeTime(item.lastMessageAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Publish</CardTitle>
              <Badge tone={agent.status === 'active' ? 'success' : 'neutral'}>{agent.status}</Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-neutral-600">
                {readySources > 0
                  ? `${readySources} ready source${readySources === 1 ? '' : 's'} can ground answers.`
                  : 'Add at least one source to activate.'}
              </p>
              {agent.status === 'active' ? (
                <form action={pauseAgentAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="agentId" value={agent.id} />
                  <Button variant="secondary" type="submit" className="w-full">
                    Pause agent
                  </Button>
                </form>
              ) : (
                <form action={activateAgentAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="agentId" value={agent.id} />
                  <Button type="submit" className="w-full" disabled={readySources === 0}>
                    Activate agent
                  </Button>
                </form>
              )}
              <div className="border-t border-neutral-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Hosted page
                </p>
                <a
                  href={hostedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-sm text-[#495CCA] hover:underline"
                >
                  {hostedUrl}
                </a>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Embed snippet
                </p>
                <EmbedSnippet snippet={snippet} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
            </CardHeader>
            <CardBody>
              <form action={deleteAgentAction} className="space-y-2">
                <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                <input type="hidden" name="agentId" value={agent.id} />
                <label className="flex items-start gap-2 text-xs text-neutral-600">
                  <input type="checkbox" required className="mt-0.5" />
                  Delete this agent and all of its sources and chunks.
                </label>
                <Button variant="danger" type="submit" className="w-full">
                  Delete agent
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
