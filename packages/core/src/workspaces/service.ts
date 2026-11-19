import { and, asc, eq } from 'drizzle-orm'
import { db, membership, workspace } from '@felops/db'
import type { Workspace, WorkspaceRole } from '@felops/db/schema'
import { ForbiddenError, SlugTakenError } from '../errors'

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current === 'object' && current !== null) {
      if ('code' in current && (current as { code?: string }).code === '23505') return true
      current = 'cause' in current ? (current as { cause?: unknown }).cause : null
    } else {
      return false
    }
  }
  return false
}

export async function createWorkspace(input: {
  userId: string
  name: string
  slug: string
}): Promise<Workspace> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(workspace)
        .values({ name: input.name, slug: input.slug })
        .returning()
      await tx.insert(membership).values({
        userId: input.userId,
        workspaceId: created.id,
        role: 'owner',
      })
      return created
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw new SlugTakenError(input.slug)
    throw error
  }
}

export async function listUserWorkspaces(userId: string): Promise<Workspace[]> {
  return db
    .select({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      createdAt: workspace.createdAt,
    })
    .from(membership)
    .innerJoin(workspace, eq(membership.workspaceId, workspace.id))
    .where(eq(membership.userId, userId))
    .orderBy(asc(workspace.slug))
}

export async function assertMembership(input: {
  userId: string
  workspaceSlug: string
}): Promise<{ workspace: Workspace; role: WorkspaceRole }> {
  const [row] = await db
    .select({ workspace, role: membership.role })
    .from(membership)
    .innerJoin(workspace, eq(membership.workspaceId, workspace.id))
    .where(and(eq(membership.userId, input.userId), eq(workspace.slug, input.workspaceSlug)))
    .limit(1)

  if (!row) throw new ForbiddenError()
  return { workspace: row.workspace, role: row.role as WorkspaceRole }
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  const [row] = await db.select().from(workspace).where(eq(workspace.slug, slug)).limit(1)
  return row ?? null
}

export async function updateWorkspace(input: {
  workspaceId: string
  name?: string
  slug?: string
}): Promise<Workspace> {
  try {
    const [row] = await db
      .update(workspace)
      .set({
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.slug === undefined ? {} : { slug: input.slug }),
      })
      .where(eq(workspace.id, input.workspaceId))
      .returning()
    return row
  } catch (error) {
    if (isUniqueViolation(error)) throw new SlugTakenError(input.slug ?? '')
    throw error
  }
}

export function assertRole(role: WorkspaceRole, allowed: WorkspaceRole[]): void {
  if (!allowed.includes(role)) throw new ForbiddenError()
}
