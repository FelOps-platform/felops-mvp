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
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827]">
        Verify your email
      </h1>
      <p className="mt-1.5 text-sm leading-6 text-[#6B7280]">
        Enter the code sent to <span className="font-medium text-[#111827]">{email}</span>.
      </p>

      <form onSubmit={verify} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="code" className="text-[12px] font-medium text-[#374151]">
            Verification code
          </Label>
          <Input
            id="code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Paste the code from the email"
            required
            className="h-11"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <Button type="submit" size="lg" className="w-full">
          Verify
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-[12px]">
        <button type="button" onClick={resend} className="text-[#6B7280] hover:text-[#111827]">
          Resend code
        </button>
        <Link href="/onboarding/workspace" className="text-[#495CCA] hover:text-[#3B4FC4]">
          Skip for now
        </Link>
      </div>
      <p className="mt-6 text-[11px] leading-5 text-[#9CA3AF]">
        In development the link and code are printed in the server console.
      </p>
    </div>
  )
}
