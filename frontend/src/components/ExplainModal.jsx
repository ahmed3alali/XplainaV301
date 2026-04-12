'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function ExplainModal({ courseId, userId, userType, takenCourses, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('shap')

  useEffect(() => {
    const fetchExplain = async () => {
      try {
        if (userType === "dataset_user") {
          const res = await api.getExplanation(userId, courseId)
          setData(res)
        } else {
          const selectedCourses = takenCourses ? takenCourses.map(c => c.COURSE_ID) : []
          const res = await api.getDynamicExplanation(selectedCourses, courseId)
          setData(res)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchExplain()
  }, [courseId, userId, userType, takenCourses])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-center shadow-2xl">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-white">Analysis Failed</h2>
          <p className="mb-6 text-slate-400">{error}</p>
          <button onClick={onClose} className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-500">Close</button>
        </div>
      </div>
    )
  }

  const formatData = (obj) => {
    if (!obj) return []
    return Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 7) // Top 7 drivers
  }

  const shapData = formatData(data?.shap_values)
  const limeData = formatData(data?.lime_values)
  const displayData = activeTab === 'shap' ? shapData : limeData

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border-subtle bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-6 py-4">
          <div className="pr-4">
            <h2 className="text-[17px] font-medium text-foreground tracking-tight break-words">{data.title}</h2>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-foreground/50">
              <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-accent" /> Match: {(data.hybrid_score * 100).toFixed(1)}%</span>
              <span>•</span>
              <span>CF: {(data.cf_score * 100).toFixed(1)}%</span>
              <span>•</span>
              <span>Content: {(data.content_score * 100).toFixed(1)}%</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-foreground/40 hover:bg-surface-raised hover:text-foreground transition-colors border border-transparent hover:border-border-subtle">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="mb-8 rounded-md border border-accent/20 bg-accent/5 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-accent">
              <Sparkles className="h-4 w-4" />
              Recommendation Insight
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/70">
              This course was recommended primarily because of your interest in <strong className="text-foreground font-medium">{data.top_genres_matched.join(', ') || 'related topics'}</strong>. 
              {data.similar_courses?.length > 0 && ` It is heavily related to courses like '${data.similar_courses[0]}'.`} 
              (This matches what our LLM agent would output).
            </p>
          </div>

          <div className="mb-6 flex gap-1.5 p-1 rounded-md bg-surface border border-border-subtle w-fit">
            <button
              onClick={() => setActiveTab('shap')}
              className={`rounded px-3 py-1.5 text-[12px] font-medium transition-all ${activeTab === 'shap' ? 'bg-surface-raised text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-border-subtle' : 'text-foreground/50 hover:text-foreground/80'}`}
            >
              SHAP Analysis
            </button>
            <button
              onClick={() => setActiveTab('lime')}
              className={`rounded px-3 py-1.5 text-[12px] font-medium transition-all ${activeTab === 'lime' ? 'bg-surface-raised text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-border-subtle' : 'text-foreground/50 hover:text-foreground/80'}`}
            >
              LIME Local Explainer
            </button>
          </div>

          <div className="rounded-md border border-border-subtle bg-surface p-5">
            <h3 className="mb-6 text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">Top Global Drivers ({activeTab.toUpperCase()})</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--foreground)', opacity: 0.5, fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 2, 2]} barSize={20}>
                    {displayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#EDEDED' : '#333333'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between px-10 text-[11px] text-foreground/40">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#333333]" /> Negative Impact</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#EDEDED]" /> Positive Impact</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
