'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

const inputClass =
  'h-11 border-white/15 bg-white/[0.03] text-white placeholder:text-white/30 focus:border-white/40 focus:ring-white/10'

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
      <h1 className="text-center text-[26px] font-semibold tracking-[-0.02em] text-white">
        Verify your email
      </h1>
      <p className="mt-2 text-center text-sm leading-6 text-white/50">
        Enter the code sent to <span className="font-medium text-white/80">{email}</span>.
      </p>

      <form onSubmit={verify} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="code" className="text-[12px] font-medium text-white/75">
            Verification code
          </Label>
          <Input
            id="code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Paste the code from the email"
            required
            className={`${inputClass} text-center tracking-wide`}
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        <Button type="submit" size="lg" className="w-full">
          Verify
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-[12px]">
        <button type="button" onClick={resend} className="text-white/50 hover:text-white">
          Resend code
        </button>
        <Link href="/onboarding/workspace" className="text-[#FF8A3F] hover:text-[#FFA46A]">
          Skip for now
        </Link>
      </div>
      <p className="mt-6 text-center text-[11px] text-white/30">
        In development the link and code are printed in the server console.
      </p>
    </div>
  )
}
