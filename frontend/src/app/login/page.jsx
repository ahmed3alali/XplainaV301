'use client'

import { signIn, useSession } from '@/providers/AuthProvider'
import { useState, useEffect } from 'react'
import { LogIn } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthPageShell } from '@/components/landing/AuthPageShell'
import { ClaripathLogo } from '@/components/ClaripathLogo'

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'authenticated') return null

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await signIn('credentials', {
      identifier,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <AuthPageShell>
      <div className="landing-card w-full max-w-[400px] px-8 py-10">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <ClaripathLogo height={32} className="mb-5" />
          <h1 className="landing-display text-xl font-bold">Sign in to Claripath</h1>
          <p className="mt-2 text-sm text-[var(--landing-muted)]">
            Welcome back. Please enter your details.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-[13px] font-medium text-[var(--landing-fg)]">
              Email or Dataset User ID
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="user@domain.com or 2"
              className="landing-input w-full"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-[var(--landing-fg)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="landing-input w-full"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="landing-btn landing-btn-primary mt-6 w-full disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current" />
            ) : (
              <>
                Continue
                <LogIn className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[13px] text-[var(--landing-muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-[var(--landing-fg)] hover:text-[var(--landing-accent)]">
            Sign Up
          </Link>
        </div>
      </div>
    </AuthPageShell>
  )
}
