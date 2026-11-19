'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

const inputClass =
  'h-11 border-white/15 bg-white/[0.03] text-white placeholder:text-white/30 focus:border-white/40 focus:ring-white/10'

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
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-white">Create Account</h1>
      <p className="mt-2 text-sm leading-6 text-white/50">
        Start configuring your AI agents in minutes.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="name" className="text-[12px] font-medium text-white/75">
            Full name
          </Label>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Maya Hassan"
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-[12px] font-medium text-white/75">
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
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-[12px] font-medium text-white/75">
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
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-3 text-[11px] font-medium text-white/45 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button type="submit" variant="contrast" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-[12px] text-white/40">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-[#FF8A3F] hover:text-[#FFA46A]">
          Sign in
        </Link>
      </p>
    </div>
  )
}
