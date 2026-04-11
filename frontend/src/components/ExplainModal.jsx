'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function ExplainModal({ courseId, userId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('shap')

  useEffect(() => {
    const fetchExplain = async () => {
      try {
        if (userId !== "0") {
          const res = await api.getExplanation(userId, courseId)
          setData(res)
        } else {
          const stored = localStorage.getItem('selectedCourses')
          const selectedCourses = stored ? JSON.parse(stored) : []
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
  }, [courseId, userId])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-6">
          <div className="pr-4">
            <h2 className="text-xl font-bold text-white tracking-tight break-words">{data.title}</h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1"><Sparkles className="h-4 w-4 text-indigo-400" /> Hybrid Match: {(data.hybrid_score * 100).toFixed(1)}%</span>
              <span>•</span>
              <span>CF: {(data.cf_score * 100).toFixed(1)}%</span>
              <span>•</span>
              <span>Content: {(data.content_score * 100).toFixed(1)}%</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Natural Language Insights Stub */}
          <div className="mb-8 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-5">
            <div className="mb-3 flex items-center gap-2 font-medium text-indigo-300">
              <Sparkles className="h-5 w-5" />
              Why this was recommended
            </div>
            <p className="text-[0.95rem] leading-relaxed text-slate-300">
              This course was recommended primarily because of your interest in <strong className="text-white">{data.top_genres_matched.join(', ') || 'related topics'}</strong>. 
              {data.similar_courses?.length > 0 && ` It is heavily related to courses like '${data.similar_courses[0]}'.`} 
              (This matches what our LLM agent would output).
            </p>
          </div>

          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab('shap')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'shap' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
            >
              SHAP Analysis
            </button>
            <button
              onClick={() => setActiveTab('lime')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === 'lime' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
            >
              LIME Local Explainer
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-6">
            <h3 className="mb-6 text-sm font-medium text-slate-400 text-center uppercase tracking-wider">Top Global Drivers ({activeTab.toUpperCase()})</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {displayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= 0 ? (activeTab === 'shap' ? '#6366f1' : '#2563eb') : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between px-10 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Negative Impact</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Positive Impact</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
