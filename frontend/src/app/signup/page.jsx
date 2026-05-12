'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, UserPlus, Sparkles } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'

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
      // Create user via FastAPI
      const res = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.detail || "Signup failed")
      }
      
      // Auto-login after successful signup utilizing NextAuth
      const loginRes = await signIn('credentials', {
        identifier: email,
        password: password,
        redirect: false,
      })
      
      if (loginRes?.error) {
        setError(loginRes.error)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-raised via-background to-background opacity-50 z-0"></div>
      <div className="w-full max-w-[400px] z-10 rounded-lg border border-border-subtle bg-surface px-8 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-border-subtle">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Create an Account</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Join Claripath to get personalized courses.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-foreground/80">
              Email Address
            </label>
            <input
               id="email"
               type="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               placeholder="user@domain.com"
               className="w-full rounded-md border border-border-subtle bg-background px-3 py-2.5 text-sm text-foreground placeholder-foreground/40 shadow-sm outline-none transition-all focus:border-brand focus:ring-1 focus:ring-brand"
               required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-foreground/80">
              Password
            </label>
            <input
               id="password"
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="••••••••"
               className="w-full rounded-md border border-border-subtle bg-background px-3 py-2.5 text-sm text-foreground placeholder-foreground/40 shadow-sm outline-none transition-all focus:border-brand focus:ring-1 focus:ring-brand"
               required
               minLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-medium text-brand-foreground shadow-sm transition-all hover:bg-brand/90 active:scale-[0.98] disabled:opacity-50 mt-6"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-foreground/20 border-t-brand-foreground" />
            ) : (
              <>
                Sign Up
                <UserPlus className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[13px] text-foreground/60">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground hover:text-foreground/80">
            Log In
          </Link>
        </div>
      </div>
    </div>
  )
}
