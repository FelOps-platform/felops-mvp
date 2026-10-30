'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const result = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Could not sign in')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Welcome back</h1>
      <p className="mt-2 text-sm text-neutral-600">Sign in to your Felops workspace.</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@cairothreads.test"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <button
        type="button"
        onClick={async () => {
          const result = await authClient.signIn.social({ provider: 'google' })
          if (result.error) setError(result.error.message ?? 'Google sign-in is not configured')
        }}
        className="mt-3 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        Continue with Google
      </button>
      <p className="mt-6 text-center text-sm text-neutral-600">
        New to Felops?{' '}
        <Link href="/sign-up" className="font-medium text-[#FA6400] hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
