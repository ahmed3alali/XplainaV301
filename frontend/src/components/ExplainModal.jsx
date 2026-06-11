'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { X, Loader2, Sparkles, AlertCircle, Bot, ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ModalPortal } from '@/components/app/ModalPortal'

export default function ExplainModal({ courseId, userId, userType, takenCourses, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('shap')

  const [llmText, setLlmText] = useState(null)
  const [llmLoading, setLlmLoading] = useState(false)
  const [llmError, setLlmError] = useState(null)
  const [showTechnical, setShowTechnical] = useState(false)

  useEffect(() => {
    const fetchExplain = async () => {
      try {
        let res
        if (userType === 'dataset_user') {
          res = await api.getExplanation(userId, courseId)
        } else {
          const selectedCourses = takenCourses ? takenCourses.map((c) => c.COURSE_ID) : []
          res = await api.getDynamicExplanation(selectedCourses, courseId)
        }
        setData(res)

        if (userType !== 'dataset_user') {
          const cacheKey = `llm_explain_${courseId}`
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            setLlmText(cached)
          } else {
            setLlmLoading(true)
            try {
              const selectedCourses = takenCourses ? takenCourses.map((c) => c.COURSE_ID) : []
              const llmRes = await api.getLlmDynamicExplanation(selectedCourses, courseId)
              const explanation = llmRes.llm_explanation
              setLlmText(explanation)
              localStorage.setItem(cacheKey, explanation)
            } catch {
              setLlmError('Could not load AI explanation.')
            } finally {
              setLlmLoading(false)
            }
          }
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
      <ModalPortal onClose={onClose} hostClassName="!w-[min(100%,24rem)]">
        <div className="app-modal items-center justify-center p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--landing-accent)]" />
          <p className="mt-3 text-sm text-[var(--landing-muted)]">Loading explanation…</p>
        </div>
      </ModalPortal>
    )
  }

  if (error) {
    return (
      <ModalPortal onClose={onClose} hostClassName="!w-[min(100%,28rem)]">
        <div className="app-modal p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-500" />
          <h2 id="explain-modal-title" className="landing-display text-lg font-bold">
            Analysis failed
          </h2>
          <p className="mt-2 text-sm text-[var(--landing-muted)]">{error}</p>
          <button type="button" onClick={onClose} className="landing-btn landing-btn-primary mt-6">
            Close
          </button>
        </div>
      </ModalPortal>
    )
  }

  const formatData = (obj) => {
    if (!obj) return []
    return Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 7)
  }

  const shapData = formatData(data?.shap_values)
  const limeData = formatData(data?.lime_values)
  const displayData = activeTab === 'shap' ? shapData : limeData

  return (
    <ModalPortal onClose={onClose} labelledBy="explain-modal-title">
      <div className="app-modal">
        <div className="app-modal-header flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h2 id="explain-modal-title" className="landing-display text-lg font-bold leading-snug sm:text-xl">
              {data.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-[var(--landing-muted)]">
              <span className="inline-flex items-center gap-1 text-[var(--landing-accent)]">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                {(data.hybrid_score * 100).toFixed(1)}% match
              </span>
              <span>CF {(data.cf_score * 100).toFixed(1)}%</span>
              <span>Content {(data.content_score * 100).toFixed(1)}%</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="app-icon-btn shrink-0" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="app-modal-body space-y-5 p-5 sm:p-6">
          <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-accent-soft)] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--landing-accent)]">
              <Bot className="h-4 w-4" strokeWidth={1.75} />
              Why was this recommended for you?
            </div>
            {llmLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--landing-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating your personalised explanation…
              </div>
            ) : llmError ? (
              <p className="text-sm text-[var(--landing-muted)]">{llmError}</p>
            ) : llmText ? (
              <p className="text-sm leading-relaxed text-[var(--landing-fg)] sm:text-[15px]">{llmText}</p>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--landing-muted)]">
                This course was recommended because of your interest in{' '}
                <strong className="font-medium text-[var(--landing-fg)]">
                  {data.top_genres_matched?.join(', ') || 'related topics'}
                </strong>
                .
                {data.similar_courses?.length > 0 && ` It relates to "${data.similar_courses[0]}".`}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            className="app-action-btn w-full justify-between"
          >
            <span>Technical analysis (SHAP & LIME)</span>
            {showTechnical ? (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </button>

          {showTechnical && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--landing-muted)]">
                <strong className="font-medium text-[var(--landing-fg)]">SHAP</strong> shows which topics pushed the
                score up or down.{' '}
                <strong className="font-medium text-[var(--landing-fg)]">LIME</strong> validates that decision locally.
              </p>

              <div className="flex w-fit gap-1 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-surface)] p-1">
                {['shap', 'lime'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'bg-[var(--landing-accent-soft)] text-[var(--landing-fg)]'
                        : 'text-[var(--landing-muted)] hover:text-[var(--landing-fg)]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                  Top drivers · {activeTab}
                </p>
                <div className="h-[260px] w-full min-h-[200px]">
                  {displayData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displayData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--landing-muted)', fontSize: 11 }}
                          width={120}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--landing-accent-soft)' }}
                          contentStyle={{
                            backgroundColor: 'var(--landing-surface)',
                            border: '1px solid var(--landing-border)',
                            borderRadius: '8px',
                            color: 'var(--landing-fg)',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" radius={[2, 2, 2, 2]} barSize={20}>
                          {displayData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.value >= 0 ? 'var(--landing-accent)' : 'var(--landing-muted)'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="flex h-full items-center justify-center text-sm text-[var(--landing-muted)]">
                      No chart data available for this view.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
