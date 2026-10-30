'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut()
        router.push('/')
        router.refresh()
      }}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  )
}
