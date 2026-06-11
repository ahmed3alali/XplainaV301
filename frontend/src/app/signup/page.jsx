'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { signIn, useSession } from '@/providers/AuthProvider'
import { api } from '@/services/api'
import { AuthPageShell } from '@/components/landing/AuthPageShell'
import { ClaripathLogo } from '@/components/ClaripathLogo'

export default function SignupPage() {
  const { status } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'authenticated') return null

  const handleSignup = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await api.signup(email, password)
      const loginRes = await signIn('credentials', {
        identifier: email,
        password: password,
        redirect: false,
      })

      if (loginRes?.error) {
        setError(loginRes.error)
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <div className="landing-card w-full max-w-[400px] px-8 py-10">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <ClaripathLogo height={32} className="mb-5" />
          <h1 className="landing-display text-xl font-bold">Create an account</h1>
          <p className="mt-2 text-sm text-[var(--landing-muted)]">
            Join Claripath to get personalized courses.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-[var(--landing-fg)]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@domain.com"
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
              minLength={6}
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
                Sign Up
                <UserPlus className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[13px] text-[var(--landing-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--landing-fg)] hover:text-[var(--landing-accent)]">
            Log In
          </Link>
        </div>
      </div>
    </AuthPageShell>
  )
}
