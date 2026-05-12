'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowRight, BrainCircuit, Terminal, 
  Workflow, Network, Zap, Shield
} from 'lucide-react'

// Vercel-style subtle fade in
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageInner />
    </Suspense>
  )
}

function LandingPageInner() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewHome = searchParams.get('home') === '1'

  useEffect(() => {
    if (status === 'authenticated' && !viewHome) {
      router.push('/dashboard')
    }
  }, [status, router, viewHome])

  if (status === 'authenticated' && !viewHome) return null

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/30 selection:text-white font-sans antialiased overflow-hidden">
      
      {/* Vercel-style minimal grid background */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="w-full h-full bg-[url('/grid.svg')] opacity-[0.03]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.08] bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <Network className="w-4 h-4 text-black" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Claripath</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[13px] font-medium text-[#888] hover:text-white transition-colors">Infrastructure</a>
            <a href="#team" className="text-[13px] font-medium text-[#888] hover:text-white transition-colors">Core Team</a>
            <button 
              onClick={() => router.push(status === 'authenticated' ? '/dashboard' : '/login')}
              className="text-[13px] font-medium text-white bg-white/10 hover:bg-white/15 border border-white/[0.08] px-4 py-1.5 rounded-full transition-all"
            >
              {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        
        {/* HERO SECTION */}
        <section className="pt-32 pb-24 px-6 flex flex-col items-center text-center">
          <motion.div 
            initial="hidden" animate="visible" variants={stagger}
            className="flex flex-col items-center max-w-4xl"
          >
            <motion.a 
              variants={fadeUp}
              href="https://github.com/ahmed3alali/XplainaV301" target="_blank" rel="noreferrer"
              className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[13px] text-[#888] hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Claripath Engine v3.0 is live</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </motion.a>
            
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-[1.05]">
              Course recommendations, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-[#888]">engineered.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="mt-6 text-[17px] text-[#888] max-w-2xl leading-relaxed font-medium">
              An intelligence layer for Software Engineering degrees. Powered by a hybrid recommendation engine, built to map your exact academic trajectory.
            </motion.p>
            
            <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={() => router.push(status === 'authenticated' ? '/dashboard' : '/login')}
                className="group flex items-center gap-2 h-12 px-6 rounded-full bg-white text-black text-[15px] font-medium hover:bg-[#eaeaea] transition-colors"
              >
                {status === 'authenticated' ? 'Go to Dashboard' : 'Start Building'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a 
                href="#features"
                className="flex items-center gap-2 h-12 px-6 rounded-full bg-transparent text-white text-[15px] font-medium border border-white/[0.15] hover:bg-white/[0.05] transition-colors"
              >
                View Architecture
              </a>
            </motion.div>
          </motion.div>

          {/* Code/Terminal Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-20 w-full max-w-4xl border border-white/[0.1] bg-[#0A0A0A] rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="h-10 border-b border-white/[0.1] bg-[#111] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="ml-4 text-[12px] font-mono text-[#666]">~/claripath/engine</div>
            </div>
            <div className="p-6 text-left font-mono text-[13px] leading-relaxed overflow-x-auto">
              <div className="text-[#888] mb-4"># Initializing Hybrid Recommendation Engine</div>
              <div className="flex gap-4">
                <span className="text-indigo-400">import</span> 
                <span className="text-white">Claripath</span>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="text-indigo-400">const</span> 
                <span className="text-white">engine = <span className="text-blue-400">new</span> Claripath.HybridModel()</span>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="text-indigo-400">await</span> 
                <span className="text-white">engine.analyze(user.transcript)</span>
              </div>
              <div className="text-emerald-400 mt-4">› Generated 5 optimal course paths with 94.2% confidence.</div>
              <div className="text-[#666] mt-2">› Explaining via SHAP/LIME integrators...</div>
            </div>
          </motion.div>
        </section>

        {/* INFRASTRUCTURE SECTION */}
        <section id="features" className="py-32 border-t border-white/[0.08] bg-[#050505]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Core Infrastructure</h2>
              <p className="text-[17px] text-[#888] max-w-2xl font-medium">
                We replaced generic college advising with deterministic, data-driven algorithms. Built specifically for the rigors of Software Engineering.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <BrainCircuit className="w-5 h-5 text-white" />,
                  title: "Hybrid Modeling",
                  desc: "Fuses Collaborative Filtering (KNN) with Content-Based TF-IDF matching to prevent cold-start failures and ensure deep personalization."
                },
                {
                  icon: <Workflow className="w-5 h-5 text-white" />,
                  title: "Explainable AI (XAI)",
                  desc: "Black boxes are unacceptable. We utilize SHAP and LIME to generate human-readable explanations for every single course recommendation."
                },
                {
                  icon: <Shield className="w-5 h-5 text-white" />,
                  title: "Deterministic Paths",
                  desc: "Maps prerequisite chains and career-specific skill demands to plot semesters chronologically. No dead ends."
                }
              ].map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  key={i} 
                  className="p-8 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] group hover:border-white/[0.15] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-[14px] text-[#888] leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM SECTION */}
        <section id="team" className="py-32 border-t border-white/[0.08] bg-black">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Core Team</h2>
                <p className="text-[17px] text-[#888] max-w-xl font-medium">
                  Developed by Software Engineering students aiming to solve the exact problems we faced during our own academic planning.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08] rounded-2xl overflow-hidden">
              {[
                { name: "Ahmed Alali", role: "Software Engineering", focus: "Architecture & AI Integration" },
                { name: "Mhd Alhabeb", role: "Software Engineering", focus: "Data Pipelines & Backend" },
                { name: "Enes Recepoglu", role: "Software Engineering", focus: "ML Models & Explainability" }
              ].map((member, i) => (
                <div key={member.name} className="bg-black p-8 group hover:bg-[#050505] transition-colors">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-white/40">{member.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                      <p className="text-[13px] font-mono text-[#666]">{member.role}</p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/[0.08]">
                    <span className="text-[12px] uppercase tracking-wider font-semibold text-[#888]">Focus</span>
                    <p className="text-[14px] text-white/70 mt-1">{member.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 border-t border-white/[0.08] bg-[#050505] text-center">
          <div className="max-w-2xl mx-auto px-6">
            <Zap className="w-8 h-8 text-white mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-6">Ready to compile your future?</h2>
            <p className="text-[17px] text-[#888] mb-10 font-medium">
              Join the platform designed to turn elective guesswork into strategic career moves.
            </p>
            <button 
              onClick={() => router.push('/login')}
              className="h-12 px-8 rounded-full bg-white text-black text-[15px] font-medium hover:bg-[#eaeaea] transition-colors"
            >
              Initialize Profile
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="py-8 border-t border-white/[0.08] bg-black text-center">
        <p className="text-[13px] text-[#666] font-medium">
          © {new Date().getFullYear()} Claripath. By SE Students, for SE Students.
        </p>
      </footer>
    </div>
  )
}


