'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Bot, User, Sparkles, ArrowLeft, GraduationCap } from 'lucide-react'

const YEAR_OPTIONS = [
  { id: '1st Year', label: '1st Year', desc: 'Just starting out' },
  { id: '2nd Year', label: '2nd Year', desc: 'Building fundamentals' },
  { id: '3rd Year', label: '3rd Year', desc: 'Getting serious' },
  { id: '4th Year', label: '4th Year+', desc: 'Final stretch' },
  { id: 'Graduate', label: 'Graduate', desc: 'Masters / PhD' },
]

const SUGGESTED_QUESTIONS = [
  "I'm failing my Data Structures course, what should I do?",
  "How do I balance studying and side projects?",
  "Should I focus on GPA or building projects in 3rd year?",
  "I feel burned out. How do I recover?",
  "What should I learn first: web dev or algorithms?",
]

export default function MentorPage() {
  const router = useRouter()
  const [yearOfStudy, setYearOfStudy] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://127.0.0.1:8000/mentor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          year_of_study: yearOfStudy,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect right now. Try again in a moment.",
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── Year selection screen ──────────────────────────────────────────────────
  if (!yearOfStudy) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 w-full max-w-lg">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-[13px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_0_40px_rgba(139,92,246,0.4)]">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Meet Ahmed</h1>
            <p className="text-[15px] text-white/50 leading-relaxed">
              Your personal CS & Software Engineering mentor.<br />
              Honest advice, no fluff.
            </p>
          </div>

          {/* Year picker */}
          <div className="mb-3">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30 mb-3 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> What year are you in?
            </p>
            <div className="grid gap-2">
              {YEAR_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setYearOfStudy(opt.id)}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-5 py-3.5 text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/5 group"
                >
                  <div>
                    <p className="text-[15px] font-medium text-white group-hover:text-violet-200 transition-colors">{opt.label}</p>
                    <p className="text-[12px] text-white/40">{opt.desc}</p>
                  </div>
                  <div className="h-5 w-5 rounded-full border border-white/15 group-hover:border-violet-400 group-hover:bg-violet-500/20 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Chat screen ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-violet-600/8 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setYearOfStudy(null)}
            className="mr-1 flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
            <Bot className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-white">Ahmed — CS Mentor</p>
            <p className="text-[11px] text-white/40">{yearOfStudy} · Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-300">
          <Sparkles className="h-3 w-3" /> AI Powered
        </div>
      </header>

      {/* Messages */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-[22px] font-bold text-white mb-2">Hey, I'm Ahmed 👋</h2>
              <p className="text-[14px] text-white/50 max-w-sm leading-relaxed">
                Ask me anything about your CS journey — studies, career, scores, burnout, side projects. Real talk only.
              </p>

              <div className="mt-8 w-full grid gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-1">Try asking</p>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left text-[13px] text-white/60 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
                msg.role === 'user'
                  ? 'bg-white/10 border border-white/10'
                  : 'bg-gradient-to-br from-violet-600 to-indigo-600'
              }`}>
                {msg.role === 'user'
                  ? <User className="h-4 w-4 text-white/70" />
                  : <Bot className="h-4 w-4 text-white" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600/20 border border-violet-500/20 text-white rounded-tr-sm'
                  : 'bg-white/[0.05] border border-white/[0.08] text-white/90 rounded-tl-sm'
              }`}>
                {msg.content.split('\n').map((line, j) => (
                  <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.05] px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="relative z-10 border-t border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex items-end gap-3"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                }}
                placeholder="Ask Ahmed anything…"
                rows={1}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-12 text-[14px] text-white placeholder:text-white/25 focus:border-violet-500/50 focus:bg-white/[0.07] focus:outline-none transition-all max-h-32 overflow-y-auto"
                style={{ minHeight: '48px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-white/20">
            Powered by AI · Not a substitute for professional guidance
          </p>
        </div>
      </div>
    </div>
  )
}
