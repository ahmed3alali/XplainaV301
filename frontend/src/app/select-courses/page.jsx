'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/services/api'
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Check } from 'lucide-react'

// ── Static data ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

const EDUCATION_LEVELS = [
  { id: 'undergraduate', label: 'Undergraduate', icon: '🎓', desc: "Bachelor's student" },
  { id: 'graduate',      label: 'Graduate',      icon: '📚', desc: "Master's student"  },
  { id: 'phd',           label: 'PhD',            icon: '🔬', desc: 'Doctoral researcher' },
]

const YEARS_BY_LEVEL = {
  undergraduate: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year+'],
  graduate:      ['Year 1', 'Year 2', 'Year 3+'],
  phd:           ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5+'],
}

// Maps the 14 backend genre columns to human-friendly labels + keywords for text matching
const SKILLS = [
  { id: 'Python',          label: 'Python',            icon: '🐍', keywords: ['python', 'programming', 'coding', 'script'] },
  { id: 'MachineLearning', label: 'Machine Learning',  icon: '🤖', keywords: ['machine learning', 'ml', 'model', 'prediction', 'ai', 'artificial intelligence', 'neural', 'deep learning'] },
  { id: 'DataScience',     label: 'Data Science',      icon: '📊', keywords: ['data science', 'data scientist', 'analytics', 'insight'] },
  { id: 'DataAnalysis',    label: 'Data Analysis',     icon: '🔍', keywords: ['data analysis', 'analyse', 'analyze', 'visualization', 'visualise', 'chart', 'excel', 'tableau'] },
  { id: 'Database',        label: 'Databases',          icon: '🗄️', keywords: ['database', 'sql', 'query', 'mysql', 'postgres', 'nosql', 'mongodb'] },
  { id: 'CloudComputing',  label: 'Cloud Computing',   icon: '☁️', keywords: ['cloud', 'aws', 'azure', 'gcp', 'google cloud', 'serverless', 'infrastructure'] },
  { id: 'BigData',         label: 'Big Data',           icon: '🌐', keywords: ['big data', 'spark', 'hadoop', 'kafka', 'pipeline', 'stream'] },
  { id: 'ComputerVision',  label: 'Computer Vision',   icon: '👁️', keywords: ['computer vision', 'image', 'opencv', 'detection', 'recognition', 'video'] },
  { id: 'Containers',      label: 'Containers / DevOps',icon: '📦', keywords: ['docker', 'kubernetes', 'container', 'devops', 'ci/cd', 'deploy'] },
  { id: 'BackendDev',      label: 'Backend Dev',        icon: '⚙️', keywords: ['backend', 'api', 'server', 'rest', 'fastapi', 'django', 'flask', 'node'] },
  { id: 'FrontendDev',     label: 'Frontend Dev',       icon: '🖥️', keywords: ['frontend', 'react', 'web', 'html', 'css', 'javascript', 'ui', 'interface'] },
  { id: 'Chatbot',         label: 'AI Chatbots',        icon: '💬', keywords: ['chatbot', 'nlp', 'language model', 'llm', 'gpt', 'conversational', 'natural language'] },
  { id: 'Blockchain',      label: 'Blockchain',         icon: '🔗', keywords: ['blockchain', 'crypto', 'web3', 'smart contract', 'ethereum'] },
  { id: 'R',               label: 'R / Statistics',     icon: '📈', keywords: ['statistics', 'r language', 'statistical', 'probability', 'regression', 'rstudio'] },
]

const SKILL_MAP = Object.fromEntries(SKILLS.map(s => [s.id, s]))

// ── Rank skills by interest text ───────────────────────────────────────────────
// Returns skills sorted: matched ones first, then the rest alphabetically.
// Always returns all 14 but with matched ones highlighted (caller decides how many to show).
function rankSkillsByText(text) {
  if (!text || text.trim().length < 3) return SKILLS

  const lower = text.toLowerCase()
  const scored = SKILLS.map(skill => {
    let score = 0
    for (const kw of skill.keywords) {
      if (lower.includes(kw)) score += kw.split(' ').length // multi-word phrases score higher
    }
    return { ...skill, score }
  })

  // Sort: highest score first, then by label alphabetically for ties
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
  return scored
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function StepDots({ current }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
          i < current ? 'bg-accent w-6' : i === current ? 'bg-accent/70 w-4' : 'bg-white/10 w-4'
        }`} />
      ))}
      <span className="ml-2 text-[11px] text-white/30 font-mono tabular-nums">
        {current + 1} / {TOTAL_STEPS}
      </span>
    </div>
  )
}

function WizardCard({ children }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  )
}

// ── Step 1 ─────────────────────────────────────────────────────────────────────
function Step1({ value, onChange, onNext }) {
  return (
    <WizardCard>
      <StepDots current={0} />
      <p className="text-[11px] font-mono tracking-widest text-accent/70 uppercase mb-3">About you</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">What best describes you?</h1>
      <p className="text-sm text-white/40 mb-8">This helps us tailor your learning journey.</p>
      <div className="grid gap-3 mb-10">
        {EDUCATION_LEVELS.map(lvl => (
          <button key={lvl.id} id={`edu-${lvl.id}`} onClick={() => onChange(lvl.id)}
            className={`group relative flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-200 ${
              value === lvl.id
                ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]'
                : 'border-white/8 bg-surface hover:border-white/15 hover:bg-surface-raised'
            }`}>
            <span className="text-2xl select-none">{lvl.icon}</span>
            <div className="flex-1">
              <p className="text-[15px] font-medium text-foreground">{lvl.label}</p>
              <p className="text-[12px] text-white/40">{lvl.desc}</p>
            </div>
            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
              value === lvl.id ? 'border-accent bg-accent' : 'border-white/20'
            }`}>
              {value === lvl.id && <Check className="h-3 w-3 text-white" />}
            </div>
          </button>
        ))}
      </div>
      <button id="step1-next" onClick={onNext} disabled={!value}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-lg transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </WizardCard>
  )
}

// ── Step 2 ─────────────────────────────────────────────────────────────────────
function Step2({ educationLevel, value, onChange, onNext, onBack }) {
  const years = YEARS_BY_LEVEL[educationLevel] || YEARS_BY_LEVEL.undergraduate
  return (
    <WizardCard>
      <StepDots current={1} />
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <p className="text-[11px] font-mono tracking-widest text-accent/70 uppercase mb-3">Academic standing</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">What year are you in?</h1>
      <p className="text-sm text-white/40 mb-8">We use this to recommend appropriately paced courses.</p>
      <div className="grid grid-cols-2 gap-3 mb-10 sm:grid-cols-3">
        {years.map(yr => (
          <button key={yr} id={`year-${yr.replace(/\s+/g, '-')}`} onClick={() => onChange(yr)}
            className={`rounded-xl border px-4 py-3.5 text-[14px] font-medium transition-all duration-200 ${
              value === yr
                ? 'border-accent bg-accent/10 text-accent shadow-[0_0_0_1px_rgba(59,130,246,0.3)]'
                : 'border-white/8 bg-surface text-white/70 hover:border-white/15 hover:bg-surface-raised hover:text-white'
            }`}>
            {yr}
          </button>
        ))}
      </div>
      <button id="step2-next" onClick={onNext} disabled={!value}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-lg transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </WizardCard>
  )
}

// ── Step 3 ─────────────────────────────────────────────────────────────────────
function Step3({ value, onChange, onNext, onBack }) {
  const MIN_CHARS = 10
  const MAX_CHARS = 300
  const len = value.trim().length
  const isValid = len >= MIN_CHARS
  return (
    <WizardCard>
      <StepDots current={2} />
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <p className="text-[11px] font-mono tracking-widest text-accent/70 uppercase mb-3">Your interests</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">What are you interested in exploring?</h1>
      <p className="text-sm text-white/40 mb-8">Write 1–2 sentences. We'll use this to suggest the right skills.</p>
      <div className="relative mb-3">
        <textarea id="interest-text" value={value} onChange={e => onChange(e.target.value.slice(0, MAX_CHARS))}
          rows={4} placeholder="e.g. I want to build machine learning models and understand how to deploy them to the cloud…"
          className="w-full resize-none rounded-xl border border-white/10 bg-surface px-4 py-3.5 text-[14px] text-foreground placeholder:text-white/20 outline-none focus:border-accent/50 focus:ring-0 transition-colors leading-relaxed" />
        <span className={`absolute bottom-3 right-3 text-[11px] font-mono ${len > MAX_CHARS * 0.9 ? 'text-amber-400' : 'text-white/20'}`}>
          {len}/{MAX_CHARS}
        </span>
      </div>
      <button id="step3-next" onClick={onNext} disabled={!isValid}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-lg transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </WizardCard>
  )
}

// ── Step 4 ─────────────────────────────────────────────────────────────────────
function Step4({ rankedSkills, selected, onToggle, onNext, onBack, loading }) {
  const count = selected.size
  const canContinue = count >= 1 && count <= 6

  // Split into suggested (score > 0) and rest
  const suggested = rankedSkills.filter(s => s.score > 0)
  const rest = rankedSkills.filter(s => s.score === 0)

  const SkillChip = ({ skill }) => {
    const isSelected = selected.has(skill.id)
    const isDisabled = !isSelected && count >= 6
    return (
      <button key={skill.id} id={`skill-${skill.id}`} onClick={() => !isDisabled && onToggle(skill.id)}
        disabled={isDisabled}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
          isSelected
            ? 'border-accent bg-accent/20 text-accent shadow-[0_0_0_1px_rgba(59,130,246,0.3)] scale-105'
            : isDisabled
            ? 'border-white/5 bg-surface text-white/20 cursor-not-allowed'
            : 'border-white/10 bg-surface text-white/60 hover:border-white/25 hover:text-white hover:bg-surface-raised'
        }`}>
        <span className="text-base leading-none select-none">{skill.icon}</span>
        {skill.label}
        {isSelected && <Check className="h-3 w-3 flex-shrink-0" />}
      </button>
    )
  }

  return (
    <WizardCard>
      <StepDots current={3} />
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <p className="text-[11px] font-mono tracking-widest text-accent/70 uppercase mb-3">Skills &amp; topics</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Which areas excite you most?</h1>
      <p className="text-sm text-white/40 mb-8">Pick <strong className="text-white/70">3 to 6</strong> topics that interest you.</p>

      {suggested.length > 0 && (
        <>
          <p className="text-[11px] font-mono text-accent/60 uppercase tracking-widest mb-3">Suggested based on your interests</p>
          <div className="flex flex-wrap gap-2.5 mb-5">
            {suggested.map(skill => <SkillChip key={skill.id} skill={skill} />)}
          </div>
          {rest.length > 0 && (
            <>
              <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-3 mt-2">Other topics</p>
              <div className="flex flex-wrap gap-2.5 mb-8">
                {rest.map(skill => <SkillChip key={skill.id} skill={skill} />)}
              </div>
            </>
          )}
        </>
      )}

      {suggested.length === 0 && (
        <div className="flex flex-wrap gap-2.5 mb-8">
          {rankedSkills.map(skill => <SkillChip key={skill.id} skill={skill} />)}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between text-[12px]">
        <span className={count >= 3 ? 'text-accent' : 'text-white/30'}>
          {count < 2 ? `Select at least ${3 - count} more` : `${count} selected ✓`}
        </span>
        {count > 6 && <span className="text-amber-400">Max 6 skills</span>}
      </div>

      <button id="step4-next" onClick={onNext} disabled={!canContinue || loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-lg transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
        {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Finding courses for you…</>) : (<>Continue<ArrowRight className="h-4 w-4" /></>)}
      </button>
    </WizardCard>
  )
}

// ── Step 5 ─────────────────────────────────────────────────────────────────────
function Step5({ extraSkills, accepted, onToggle, onFinish, onBack, loading }) {
  return (
    <WizardCard>
      <StepDots current={4} />
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] text-accent font-medium">
        <Sparkles className="h-3 w-3" />Discovered from your recommendations
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">We also found courses in these areas</h1>
      <p className="text-sm text-white/40 mb-8">
        Based on your selections, our system also surfaced courses touching these topics. Would you like to include them?
      </p>
      {extraSkills.length === 0 ? (
        <p className="text-sm text-white/30 mb-8 italic">Your selections already cover everything — great taste!</p>
      ) : (
        <div className="flex flex-wrap gap-2.5 mb-8">
          {extraSkills.map(skillId => {
            const skill = SKILL_MAP[skillId] || { id: skillId, label: skillId, icon: '✨' }
            const isAccepted = accepted.has(skillId)
            return (
              <button key={skillId} id={`extra-skill-${skillId}`} onClick={() => onToggle(skillId)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
                  isAccepted
                    ? 'border-accent bg-accent/20 text-accent shadow-[0_0_0_1px_rgba(59,130,246,0.3)] scale-105'
                    : 'border-white/10 bg-surface text-white/60 hover:border-white/25 hover:text-white hover:bg-surface-raised'
                }`}>
                <span className="text-base leading-none select-none">{skill.icon}</span>
                {skill.label}
                {isAccepted && <Check className="h-3 w-3 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
      <button id="step5-finish" onClick={onFinish} disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-lg transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
        {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Building your recommendations…</>) : (<><Sparkles className="h-4 w-4" />See my recommendations</>)}
      </button>
    </WizardCard>
  )
}

function LoadingOverlay({ message }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm text-white/50">{message}</p>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [educationLevel, setEducationLevel] = useState('')
  const [collegeYear, setCollegeYear] = useState('')
  const [interestText, setInterestText] = useState('')
  const [selectedSkills, setSelectedSkills] = useState(new Set())
  const [extraSkills, setExtraSkills] = useState([])
  const [acceptedExtras, setAcceptedExtras] = useState(new Set())
  const [cachedRecs, setCachedRecs] = useState(null)
  const [cachedSeeds, setCachedSeeds] = useState([])
  const [loading, setLoading] = useState(false)

  // Auth guard — runs only once when status resolves
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.userType === 'dataset_user') {
      router.push('/dashboard')
    }
  }, [status]) // intentionally only [status] to avoid re-running on every session update

  const toggleSkill = useCallback((id) => {
    setSelectedSkills(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleExtra = useCallback((id) => {
    setAcceptedExtras(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Rank skills from interest text — memoised inline
  const rankedSkills = rankSkillsByText(interestText)

  // Step 4 → Step 5: call backend, cache recs
  const handleStep4Next = useCallback(async () => {
    setLoading(true)
    try {
      const skills = Array.from(selectedSkills)
      const data = await api.getSkillRecommendations(skills, 30, 0.5)
      setCachedRecs(data.recommendations || [])
      setCachedSeeds(data.seed_courses || [])
      setExtraSkills(data.extra_skills || [])
      setStep(4)
    } catch (err) {
      console.error('Skill recommendation failed', err)
      setCachedRecs([])
      setCachedSeeds([])
      setExtraSkills([])
      setStep(4)
    } finally {
      setLoading(false)
    }
  }, [selectedSkills])

  // Step 5 → Dashboard
  const handleFinish = useCallback(async () => {
    setLoading(true)
    try {
      const finalSkills = Array.from(new Set([...selectedSkills, ...acceptedExtras]))
      let finalRecs = cachedRecs || []

      let finalSeeds = cachedSeeds || []

      if (acceptedExtras.size > 0) {
        try {
          const data = await api.getSkillRecommendations(finalSkills, 30, 0.5)
          finalRecs = data.recommendations || finalRecs
          finalSeeds = data.seed_courses || finalSeeds
        } catch (_) {}
      }

      // Store recs so dashboard reads them instantly
      sessionStorage.setItem('pendingRecs', JSON.stringify(finalRecs))

      // Save profile + courses (fire-and-forget)
      if (session?.user?.apiToken) {
        api.saveProfile(session.user.apiToken, {
          education_level: educationLevel,
          college_year: collegeYear,
          interest_text: interestText,
          selected_skills: finalSkills,
        }).catch(() => {})

        // Save the pure seed courses so the model can re-run from dashboard later, and sidebar shows actual seeds
        const courseIds = finalSeeds.slice(0, 20)
        if (courseIds.length > 0) {
          fetch('http://127.0.0.1:8000/courses/my-courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.user.apiToken}` },
            body: JSON.stringify({ selected_courses: courseIds }),
          }).catch(() => {})
        }
      }

      // Use ?onboarded=1 so dashboard skips the redirect-back-to-wizard check
      router.push('/dashboard?onboarded=1')
    } catch (err) {
      console.error('Finish failed', err)
      router.push('/dashboard?onboarded=1')
    }
  }, [selectedSkills, acceptedExtras, cachedRecs, session, educationLevel, collegeYear, interestText, router])

  if (status === 'loading') return <LoadingOverlay message="Loading…" />

  if (step === 0)
    return <Step1 value={educationLevel} onChange={lvl => { setEducationLevel(lvl); setCollegeYear('') }} onNext={() => setStep(1)} />

  if (step === 1)
    return <Step2 educationLevel={educationLevel} value={collegeYear} onChange={setCollegeYear} onNext={() => setStep(2)} onBack={() => setStep(0)} />

  if (step === 2)
    return <Step3 value={interestText} onChange={setInterestText} onNext={() => setStep(3)} onBack={() => setStep(1)} />

  if (step === 3)
    return <Step4 rankedSkills={rankedSkills} selected={selectedSkills} onToggle={toggleSkill} onNext={handleStep4Next} onBack={() => setStep(2)} loading={loading} />

  if (step === 4)
    return <Step5 extraSkills={extraSkills} accepted={acceptedExtras} onToggle={toggleExtra} onFinish={handleFinish} onBack={() => setStep(3)} loading={loading} />

  return <LoadingOverlay message="Almost there…" />
}
