'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import type { Workspace } from '@felops/db/schema'
import {
  BookOpen,
  Bot,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { Brand } from '@/components/brand'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { SignOutButton } from '@/components/sign-out-button'
import { cn, initials } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  exact?: boolean
}

const workspaceNav: NavItem[] = [
  { href: '', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/conversations', label: 'Conversations', icon: MessagesSquare },
  { href: '/approvals', label: 'Actions & Approvals', icon: ShieldCheck },
  { href: '/audit', label: 'Audit trail', icon: ScrollText },
]

const managementNav: NavItem[] = [
  { href: '/settings', label: 'Workspace settings', icon: Settings, exact: true },
]

const accountNav: NavItem[] = [
  { href: '/settings#profile', label: 'Profile & Account', icon: UserRound },
  { href: '/settings#plan', label: 'Billing & plan', icon: CreditCard },
]

function NavGroup({
  label,
  items,
  slug,
  pathname,
  onNavigate,
}: {
  label: string
  items: NavItem[]
  slug: string
  pathname: string
  onNavigate?: () => void
}) {
  const base = `/w/${slug}`
  return (
    <div className="mb-6">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const cleanHref = item.href.split('#')[0]
          const href = `${base}${item.href}`
          const activeHref = `${base}${cleanHref}`
          const isHashLink = item.href.includes('#')
          const active =
            !isHashLink &&
            (item.exact
              ? pathname === activeHref
              : pathname === activeHref || pathname.startsWith(`${activeHref}/`))
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-[#495CCA] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <Icon
                className={cn(
                  'h-[17px] w-[17px] shrink-0 transition-colors',
                  active ? 'text-white' : 'text-white/40 group-hover:text-white/80',
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function SidebarBody({
  workspace,
  workspaces,
  user,
  role,
  plan,
  pathname,
  onNavigate,
}: {
  workspace: Workspace
  workspaces: Workspace[]
  user: { name: string; email: string }
  role: string
  plan: string
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <Brand href={`/w/${workspace.slug}`} />
      </div>
      <div className="px-3">
        <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
      </div>
      <nav className="dark-scroll mt-7 flex-1 overflow-y-auto px-3 pb-4" aria-label="Workspace">
        <NavGroup
          label="Workspace"
          items={workspaceNav}
          slug={workspace.slug}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavGroup
          label="Workspace management"
          items={managementNav}
          slug={workspace.slug}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavGroup
          label="Account"
          items={accountNav}
          slug={workspace.slug}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-white">{user.name}</span>
            <span className="block truncate text-[11px] capitalize text-white/40">
              {role} · {plan}
            </span>
          </span>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}

export function AppSidebar({
  workspace,
  workspaces,
  user,
  role,
}: {
  workspace: Workspace
  workspaces: Workspace[]
  user: { name: string; email: string }
  role: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/[0.08] bg-[#0B0B0F] lg:flex">
        <SidebarBody
          workspace={workspace}
          workspaces={workspaces}
          user={user}
          role={role}
          plan={workspace.plan}
          pathname={pathname}
        />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#0B0B0F]/95 px-5 backdrop-blur lg:hidden">
        <Brand href={`/w/${workspace.slug}`} />
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[286px] max-w-[86vw] flex-col border-r border-white/10 bg-[#0B0B0F] shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody
              workspace={workspace}
              workspaces={workspaces}
              user={user}
              role={role}
              plan={workspace.plan}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  )
}
