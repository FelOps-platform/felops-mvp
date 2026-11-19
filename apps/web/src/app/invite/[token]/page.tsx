import Link from 'next/link'
import { getInvitationByToken } from '@felops/core/members'
import { getSessionUser } from '@/lib/workspace'
import { Button } from '@/components/ui/button'
import { Brand } from '@/components/brand'
import { acceptInvitationAction } from './actions'

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const query = await searchParams
  const [invitation, user] = await Promise.all([getInvitationByToken(token), getSessionUser()])

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-6">
          <Brand className="text-neutral-900" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">Join your team on Felops</h1>
        {query.error === 'expired' ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            This invitation has expired or was already used.
          </p>
        ) : null}
        {!invitation ? (
          <p className="mt-4 text-sm text-neutral-600">
            This invitation is not valid. Ask an owner or admin to send a new one.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              You were invited as <span className="font-medium">{invitation.role}</span> for{' '}
              <span className="font-medium">{invitation.email}</span>.
            </p>
            {user ? (
              <form action={acceptInvitationAction} className="mt-6">
                <input type="hidden" name="token" value={token} />
                <Button type="submit" className="w-full">
                  Accept invitation
                </Button>
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                <Link href={`/sign-in?invite=${encodeURIComponent(token)}`}>
                  <Button className="w-full">Sign in to accept</Button>
                </Link>
                <Link href="/sign-up">
                  <Button variant="secondary" className="w-full">
                    Create an account
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
