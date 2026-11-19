'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const result = await authClient.signUp.email({ name, email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Could not create your account')
      return
    }
    router.push(`/verify?email=${encodeURIComponent(email)}`)
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827]">
        Create account
      </h1>
      <p className="mt-1.5 text-sm leading-6 text-[#6B7280]">
        Start configuring your AI agents in minutes.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="name" className="text-[12px] font-medium text-[#374151]">
            Full name
          </Label>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Maya Hassan"
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-[12px] font-medium text-[#374151]">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-[12px] font-medium text-[#374151]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="h-11 pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-3 text-[11px] font-medium text-[#6B7280] hover:text-[#111827]"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-[12px] text-[#6B7280]">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-[#495CCA] hover:text-[#3B4FC4]">
          Sign in
        </Link>
      </p>
    </div>
  )
}
