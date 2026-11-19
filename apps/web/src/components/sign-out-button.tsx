'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      title="Sign out"
      aria-label="Sign out"
      onClick={async () => {
        await authClient.signOut()
        router.push('/')
        router.refresh()
      }}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
    >
      <LogOut className="h-4 w-4" />
    </button>
  )
}
