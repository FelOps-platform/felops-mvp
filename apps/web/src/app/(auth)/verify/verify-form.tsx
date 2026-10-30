'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

export function VerifyForm({ email }: { email: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const result = await authClient.verifyEmail({
      query: { token: code.trim() },
    })
    if (result.error) {
      setError(result.error.message ?? 'That code did not work')
      return
    }
    setMessage('Verified. Taking you to your workspace…')
    router.push('/onboarding/workspace')
    router.refresh()
  }

  async function resend() {
    setError('')
    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/onboarding/workspace',
    })
    if (result.error) setError(result.error.message ?? 'Could not resend the email')
    else setMessage('A new verification link is on its way.')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Verify your email</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        We sent a verification link to <span className="font-medium text-neutral-900">{email}</span>.
        In development, the link and code are printed in the server console.
      </p>
      <form onSubmit={verify} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="code">Verification code or token</Label>
          <Input
            id="code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Paste the code from the email"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <Button type="submit" className="w-full">
          Verify email
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={resend} className="text-[#FA6400] hover:underline">
          Resend email
        </button>
        <Link href="/onboarding/workspace" className="text-neutral-600 hover:underline">
          Skip for now
        </Link>
      </div>
    </div>
  )
}
