import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import Navbar from "../components/Navbar"
import "./css/Persona.css"

const PERSONA_TIPS = {
  ERRATIC_SPENDER: [
    "Try a 24-hour rule — wait a day before making non-essential purchases over £20.",
    "Set up a separate 'fun money' account with a fixed weekly limit.",
    "Review your last week's spending each Monday to spot irregular patterns.",
  ],
  CAUTIOUS_SAVER: [
    "You're doing great! Consider putting savings into a high-interest account.",
    "Set a small 'treat yourself' budget so saving doesn't feel like deprivation.",
    "Review your budget monthly — you might find room to invest more.",
  ],
  WEEKEND_SPLURGER: [
    "Plan weekend activities in advance and set a weekend budget cap.",
    "Try free or low-cost weekend activities like parks, cooking at home, or free events.",
    "Move money to savings on Friday before the weekend starts.",
  ],
  BALANCED_SPENDER: [
    "Great balance! Consider increasing your savings rate by even 2-3%.",
    "Look into automating your investments to grow wealth passively.",
    "Share your budgeting strategies — you could help others improve too.",
  ],
  VOLATILE_SPENDER: [
    "Set a fixed daily spending limit and review it each evening.",
    "Use envelope budgeting to cap each category's spending.",
    "Track spending daily — awareness is the first step to consistency.",
  ],
  LATE_NIGHT_SPENDER: [
    "Set a spending curfew — avoid purchases after 10pm.",
    "Remove saved payment methods from late-night shopping apps.",
    "Plan your next-day purchases before bed instead of buying impulsively.",
  ],
  CATEGORY_FOCUSED: [
    "Review your top spending category — can you find cheaper alternatives?",
    "Set a hard cap for your dominant category and track it weekly.",
    "Diversify spending to avoid over-reliance on one area.",
  ],
  BIG_SPENDER: [
    "Set a monthly spending ceiling and track progress weekly.",
    "Before big purchases, wait 48 hours and reconsider.",
    "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
  ],
}

const DEFAULT_TIPS = [
  "Track your spending daily to build awareness of your habits.",
  "Set realistic budgets for each category and review weekly.",
  "Consider automating savings to build a financial safety net.",
]

const PERSONA_COLORS = {
  ERRATIC_SPENDER: "#ef4444",
  CAUTIOUS_SAVER: "#3b82f6",
  WEEKEND_SPLURGER: "#f97316",
  BALANCED_SPENDER: "#10b981",
  VOLATILE_SPENDER: "#eab308",
  LATE_NIGHT_SPENDER: "#8b5cf6",
  CATEGORY_FOCUSED: "#ec4899",
  BIG_SPENDER: "#f59e0b",
  INSUFFICIENT_DATA: "#9ca3af",
}

const DEFAULT_COLOR = "#6b7280"

const PERSONA_LABELS = {
  ERRATIC_SPENDER: "Erratic Spender",
  CAUTIOUS_SAVER: "Cautious Saver",
  WEEKEND_SPLURGER: "Weekend Splurger",
  BALANCED_SPENDER: "Balanced Spender",
  VOLATILE_SPENDER: "Volatile Spender",
  LATE_NIGHT_SPENDER: "Late Night Spender",
  CATEGORY_FOCUSED: "Category Focused",
  BIG_SPENDER: "Big Spender",
  INSUFFICIENT_DATA: "Insufficient Data",
}

const PERSONA_DESCRIPTIONS = {
  ERRATIC_SPENDER: "Irregular spending with high variance between transactions. Occasional large unplanned purchases that make budgeting difficult.",
  CAUTIOUS_SAVER: "Consistently low spending with rare large purchases. Strong financial discipline and predictable patterns.",
  WEEKEND_SPLURGER: "Disciplined during weekdays but spending spikes significantly on weekends. Social and leisure activities drive the gap.",
  BALANCED_SPENDER: "Even spending across categories with moderate consistency. No single extreme — a well-rounded financial profile.",
  VOLATILE_SPENDER: "Month-to-month totals swing significantly. Hard to forecast, which can lead to surprise shortfalls.",
  LATE_NIGHT_SPENDER: "A notable share of purchases happen after 10pm. Late-night transactions tend to be less deliberate.",
  CATEGORY_FOCUSED: "Spending is heavily concentrated in one or two categories. A price change there could hit the budget hard.",
  BIG_SPENDER: "Higher-than-average transaction sizes across the board. Large individual purchases drive the spending profile.",
}

const SPIDER_AXIS_LABELS = {
  impulse: "Impulse",
  volatility: "Volatility",
  budget_discipline: "Budget Discipline",
  weekend_bias: "Weekend Bias",
  late_night_activity: "Late Night",
  category_concentration: "Category Focus",
}

const SPIDER_AXIS_DESCRIPTIONS = {
  impulse: "How much your transaction amounts vary. High means frequent large, unplanned purchases.",
  volatility: "How much your monthly spending totals swing. High means hard-to-predict months.",
  budget_discipline: "How closely you stick to your planned category budgets. Higher is better.",
  weekend_bias: "How much of your spending is concentrated on weekends versus weekdays.",
  late_night_activity: "How many of your purchases happen after 10pm. Often less deliberate spending.",
  category_concentration: "How heavily your spending is focused in one or two categories.",
}

const DOMAIN_TRAIT_LABELS = {
  WEEKEND_BIAS: "Weekend Bias",
  LATE_NIGHT_TENDENCY: "Late Night",
  EMOTIONAL_SPENDER: "Emotional Spender",
  HIGH_VOLATILITY: "High Volatility",
  CATEGORY_HEAVY_FOOD: "Food Heavy",
  CATEGORY_HEAVY_TRAVEL: "Travel Heavy",
  CATEGORY_HEAVY_LEISURE: "Leisure Heavy",
  CATEGORY_HEAVY_EDUCATION: "Education Heavy",
  CATEGORY_HEAVY_OTHER: "Other Heavy",
  AT_RISK_OF_OVERSPEND: "Overspend Risk",
}

const DOMAIN_TRAIT_COLORS = {
  WEEKEND_BIAS: "#f97316",
  LATE_NIGHT_TENDENCY: "#8b5cf6",
  EMOTIONAL_SPENDER: "#ec4899",
  HIGH_VOLATILITY: "#eab308",
  AT_RISK_OF_OVERSPEND: "#ef4444",
}

const NUDGE_TYPE_COLORS = {
  Corrective: { bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)", text: "#dc2626" },
  Forecast: { bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)", text: "#d97706" },
  Reflective: { bg: "rgba(139, 92, 246, 0.08)", border: "rgba(139, 92, 246, 0.2)", text: "#7c3aed" },
  Awareness: { bg: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.2)", text: "#2563eb" },
  Goal: { bg: "rgba(6, 182, 212, 0.08)", border: "rgba(6, 182, 212, 0.2)", text: "#0891b2" },
  Positive: { bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.2)", text: "#059669" },
}

function formatFeatureName(feature) {
  return feature
    .replace(/_/g, " ")
    .replace(/\b(pct|avg|txn|cnt)\b/gi, (m) => {
      const map = { pct: "%", avg: "average", txn: "transaction", cnt: "count" }
      return map[m.toLowerCase()] || m
    })
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function RadarChart({ axes, size = 280 }) {
  const keys = Object.keys(SPIDER_AXIS_LABELS)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.30
  const n = keys.length
  const angleStep = (2 * Math.PI) / n
  const offsetAngle = -Math.PI / 2
  const pad = { left: 70, right: 70, top: 20, bottom: 20 }
  const vbW = size + pad.left + pad.right
  const vbH = size + pad.top + pad.bottom

  const point = (i, pct) => {
    const a = offsetAngle + i * angleStep
    return [cx + pad.left + r * (pct / 100) * Math.cos(a), cy + pad.top + r * (pct / 100) * Math.sin(a)]
  }

  const chartCx = cx + pad.left
  const chartCy = cy + pad.top
  const rings = [25, 50, 75, 100]

  const dataPoints = keys.map((k, i) => point(i, axes[k] || 0))
  const polygon = dataPoints.map((p) => p.join(",")).join(" ")

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="radar-chart-svg">
      {rings.map((pct) => {
        const pts = keys.map((_, i) => point(i, pct)).map((p) => p.join(",")).join(" ")
        return <polygon key={pct} points={pts} fill="none" stroke="var(--gray-200)" strokeWidth="1" />
      })}
      {keys.map((_, i) => {
        const [ex, ey] = point(i, 100)
        return <line key={i} x1={chartCx} y1={chartCy} x2={ex} y2={ey} stroke="var(--gray-200)" strokeWidth="1" />
      })}
      <polygon points={polygon} fill="rgba(16,185,129,0.18)" stroke="var(--emerald-500)" strokeWidth="2" />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="var(--emerald-500)" />
      ))}
      {keys.map((k, i) => {
        const labelR = r + 22
        const a = offsetAngle + i * angleStep
        const lx = chartCx + labelR * Math.cos(a)
        const ly = chartCy + labelR * Math.sin(a)
        const anchor = Math.abs(Math.cos(a)) < 0.01 ? "middle" : Math.cos(a) > 0 ? "start" : "end"
        return (
          <text key={k} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central" className="radar-label">
            {SPIDER_AXIS_LABELS[k]}
          </text>
        )
      })}
      {keys.map((k, i) => {
        const [x, y] = dataPoints[i]
        const a = offsetAngle + i * angleStep
        const ox = 10 * Math.cos(a)
        const oy = 10 * Math.sin(a)
        return (
          <text key={`v-${k}`} x={x + ox} y={y + oy} textAnchor="middle" dominantBaseline="central" className="radar-value">
            {Math.round(axes[k] || 0)}
          </text>
        )
      })}
    </svg>
  )
}

function NudgeList({ nudges }) {
  if (!nudges || nudges.length === 0) return null

  return (
    <div className="persona-detail-card nudge-list-card">
      <h3>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        Smart Nudges
      </h3>
      <div className="nudge-list">
        {nudges.map((nudge, i) => {
          const colors = NUDGE_TYPE_COLORS[nudge.nudge_type] || NUDGE_TYPE_COLORS.Awareness
          return (
            <div
              key={nudge.id || i}
              className="nudge-item"
              style={{ background: colors.bg, borderColor: colors.border }}
            >
              <div className="nudge-item-header">
                <span className="nudge-type-badge" style={{ color: colors.text, background: `${colors.text}15` }}>
                  {nudge.nudge_type || "Info"}
                </span>
                <div className="nudge-badges">
                  {nudge.severity && (
                    <span className={`nudge-severity-badge severity-${nudge.severity}`}>{nudge.severity}</span>
                  )}
                  {nudge.timing && (
                    <span className={`nudge-timing-badge timing-${nudge.timing}`}>{nudge.timing}</span>
                  )}
                </div>
              </div>
              <div className="nudge-item-title">{nudge.title}</div>
              <div className="nudge-item-message">{nudge.message}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Persona() {
  const { user } = useAuth()
  const [personaData, setPersonaData] = useState(null)
  const [nudgesData, setNudgesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [expenseCount, setExpenseCount] = useState(0)

  const [analysing, setAnalysing] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showAxisGuide, setShowAxisGuide] = useState(false)
  const [showConfidence, setShowConfidence] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [autoAnalysisDone, setAutoAnalysisDone] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadPersonaData()
      loadExpenseCount()
    }
  }, [user?.id])

  // Auto-analyse when user has enough expenses but no persona yet (once per page load)
  useEffect(() => {
    if (loading || analysing || autoAnalysisDone) return
    const active = personaData ? (personaData.persona_primary || personaData.persona_type) : null
    const needsAnalysis = !personaData || active === "INSUFFICIENT_DATA"
    if (needsAnalysis && expenseCount >= 10) {
      setAutoAnalysisDone(true)
      runAnalysis()
    }
  }, [loading, personaData, expenseCount, autoAnalysisDone])

  const runAnalysis = async () => {
    setAnalysing(true)
    setAnalysisError(null)
    try {
      const analyseRes = await api.post(`/ml/analyse/${user.id}`)
      console.log("[Persona] Analysis result:", analyseRes.data)
      const personaResult = analyseRes.data?.persona
      if (personaResult?.persona_type === "INSUFFICIENT_DATA") {
        console.warn("[Persona] Analysis returned INSUFFICIENT_DATA:", personaResult.description)
        setAnalysisError(personaResult.description || "Clustering features could not be computed — check your expense data.")
      }
      const [personaRes, nudgesRes] = await Promise.all([
        api.get(`/ml/persona/${user.id}`),
        api.get(`/ml/nudges/${user.id}`),
      ])
      console.log("[Persona] Loaded persona:", personaRes.data?.persona_type)
      setPersonaData(personaRes.data)
      setNudgesData(nudgesRes.data.nudges || [])
    } catch (err) {
      console.error("[Persona] Analysis failed:", err?.response?.status, err?.response?.data || err.message)
      const msg = err?.response?.data?.detail || err?.response?.data?.error || "Analysis failed — is the ML service running on port 8000?"
      setAnalysisError(msg)
    } finally {
      setAnalysing(false)
    }
  }

  const loadPersonaData = async () => {
    try {
      const [personaRes, nudgesRes] = await Promise.all([
        api.get(`/ml/persona/${user.id}`),
        api.get(`/ml/nudges/${user.id}`),
      ])
      console.log("[Persona] Existing persona:", personaRes.data?.persona_type, "provisional:", personaRes.data?.provisional)
      setPersonaData(personaRes.data)
      setNudgesData(nudgesRes.data.nudges || [])
    } catch (err) {
      console.log("[Persona] No existing persona:", err?.response?.status || err.message)
      setPersonaData(null)
      setNudgesData([])
    } finally {
      setLoading(false)
    }
  }

  const loadExpenseCount = async () => {
    try {
      const res = await api.get(`/expenses?userId=${user.id}`)
      setExpenseCount(Array.isArray(res.data) ? res.data.length : 0)
    } catch {
      setExpenseCount(0)
    }
  }

  const activePersonaType = personaData ? (personaData.persona_primary || personaData.persona_type) : null

  const confidenceData = personaData?.confidence_data || {}
  const confidenceScore = confidenceData.score !== undefined ? Math.round(confidenceData.score) : (personaData ? Math.round(personaData.confidence * 100) : 0)
  const confidenceLevel = (personaData?.confidence_level || confidenceData.level || (confidenceScore >= 70 ? "High" : confidenceScore >= 40 ? "Medium" : "Low")).toLowerCase()
  const tips = activePersonaType ? (PERSONA_TIPS[activePersonaType] || PERSONA_TIPS[personaData?.persona_type] || DEFAULT_TIPS) : []
  const accentColor = activePersonaType ? (PERSONA_COLORS[activePersonaType] || DEFAULT_COLOR) : DEFAULT_COLOR
  const displayLabel = activePersonaType ? (PERSONA_LABELS[activePersonaType] || personaData?.persona_label || activePersonaType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())) : ""
  const basePersonaType = personaData?.base_persona || null
  const isRefined = basePersonaType && basePersonaType !== activePersonaType
  const baseLabel = isRefined ? (PERSONA_LABELS[basePersonaType] || basePersonaType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())) : null


  return (
    <div className="persona-page">
      <Navbar />
      <div className="persona-main">
        <div className="persona-header">
          <h1>Your Spending Persona</h1>
          <p>AI-powered insights into your financial behaviour</p>
        </div>

        {loading || analysing ? (
          <div className="persona-loading">
            <div className="persona-loading-spinner" />
            <p>{analysing ? "Running AI analysis on your spending..." : "Loading your persona..."}</p>
          </div>
        ) : !personaData || activePersonaType === "INSUFFICIENT_DATA" ? (
          <div className="persona-locked">
            <div className="persona-locked-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2>{personaData ? "More Data Needed" : "Persona Locked"}</h2>
            <p>
              {personaData?.description && personaData.description !== "Insufficient Data"
                ? personaData.description
                : personaData
                  ? "Log more expenses to discover your spending persona. We need a broader spending history for accurate analysis."
                  : "Log at least 10 expenses so our AI can start analysing your spending patterns."}
            </p>
            <div className="persona-progress-bar">
              <div
                className="persona-progress-fill"
                style={{ width: `${Math.min((expenseCount / 10) * 100, 100)}%` }}
              />
            </div>
            <span className="persona-progress-text">{expenseCount} / 10 expenses logged</span>
            {analysisError && (
              <p className="persona-analysis-error">{analysisError}</p>
            )}
            {expenseCount >= 10 && !analysing && (
              <button className="persona-retry-btn" onClick={runAnalysis}>
                Analyse Now
              </button>
            )}
          </div>
        ) : (
          <>
            
            {personaData.provisional && (
              <div className="persona-provisional-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>
                  <strong>Provisional Persona</strong>
                  <p>Based on {expenseCount} expenses. {expenseCount < 30
                    ? `Log ${30 - expenseCount} more expenses over at least 2 weeks for a full persona.`
                    : "Keep logging expenses over a longer period for a more stable persona."}</p>
                </div>
              </div>
            )}

            
            <div className="persona-profile-card">
              <div className="persona-profile-top">
                <div className="persona-profile-info">
                  <div className="persona-type-row">
                    <span className={`persona-type-label persona-type-${activePersonaType}`}>
                      <span className="dot" />
                      {displayLabel}
                    </span>
                    <button className="persona-guide-btn" onClick={() => setShowGuide(true)}>View All Types</button>
                  </div>
                  <h2>{user.name}</h2>
                  <p className="persona-description">{personaData.description}</p>
                  {isRefined && (
                    <div className="persona-refinement-info">
                      <p className="refinement-base">Base profile: {baseLabel} (from spending pattern analysis)</p>
                      <p className="refinement-reason">Refined profile: {displayLabel} — {personaData.refinement_reason}</p>
                    </div>
                  )}
                  {personaData.domain_traits && personaData.domain_traits.length > 0 && (
                    <div className="persona-domain-traits">
                      {personaData.domain_traits.map((trait) => (
                        <span
                          key={trait}
                          className="domain-trait-badge"
                          style={{ borderColor: DOMAIN_TRAIT_COLORS[trait] || "var(--gray-300)", color: DOMAIN_TRAIT_COLORS[trait] || "var(--gray-600)" }}
                        >
                          {DOMAIN_TRAIT_LABELS[trait] || trait.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="persona-stats-row">
                <div className="persona-stat">
                  <div className="persona-stat-value">{expenseCount}</div>
                  <div className="persona-stat-label">Expenses Tracked</div>
                </div>
                <div className="persona-stat">
                  <div className="persona-stat-value">
                    {confidenceScore}%
                    <span className={`confidence-level-badge ${confidenceLevel}`}>{confidenceLevel}</span>
                  </div>
                  <div className="persona-stat-label">Confidence</div>
                </div>
              </div>
            </div>

            
            <div className="persona-details-grid">
              {personaData.spider_axes && Object.keys(personaData.spider_axes).length > 0 && (
                <div className="persona-detail-card radar-chart-card">
                  <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                    </svg>
                    Behavioural Profile
                  </h3>
                  <div className="radar-chart-container">
                    <RadarChart axes={personaData.spider_axes} />
                  </div>
                  <div className="radar-chart-footer">
                    <button className="persona-guide-btn" onClick={() => setShowAxisGuide(true)}>View All Axes</button>
                  </div>
                </div>
              )}

              {personaData.spider_explanation && personaData.spider_explanation.topDrivers?.length > 0 && (
                <div className="persona-detail-card spider-explanation-card">
                  <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Understanding Your Profile
                  </h3>

                  <div className="spider-explanation-section">
                    <h4>Why This Shape</h4>
                    {personaData.spider_explanation.topDrivers.map((driver, i) => (
                      <div key={driver.axis} className={`spider-driver-row ${driver.direction}`}>
                        <div className="spider-driver-header">
                          <span className="spider-driver-axis">{driver.label}</span>
                          <span className="spider-driver-score">{Math.round(driver.score)}</span>
                        </div>
                        <span className="spider-driver-text">{driver.explanation}</span>
                      </div>
                    ))}
                  </div>

                  {personaData.spider_explanation.meaningSummary && (
                    <div className="spider-explanation-section">
                      <h4>What This Means</h4>
                      <p className="spider-meaning-text">{personaData.spider_explanation.meaningSummary}</p>
                    </div>
                  )}

                  {personaData.spider_explanation.nextActions?.length > 0 && (
                    <div className="spider-explanation-section">
                      <h4>What To Do Next</h4>
                      <ul className="spider-actions-list">
                        {personaData.spider_explanation.nextActions.map((action, i) => (
                          <li key={i}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}



              <NudgeList nudges={nudgesData} />

              

              
              <div className="persona-detail-card explanation-card">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Why This Persona?
                </h3>
                {personaData.explanation?.text && (
                  <p className="explanation-text">{personaData.explanation.text}</p>
                )}
                {personaData.explanation?.reasons?.length > 0 && (
                  <div className="explanation-reasons">
                    {personaData.explanation.reasons.map((reason, i) => (
                      <div key={i} className="explanation-reason-item">
                        <span className="explanation-reason-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
                {personaData.top_features?.length > 0 && (
                  <div className="explanation-drivers">
                    <span className="explanation-drivers-label">Top drivers:</span>
                    {personaData.top_features.map((feature) => (
                      <span key={feature} className="explanation-driver-chip">{formatFeatureName(feature)}</span>
                    ))}
                  </div>
                )}
              </div>

              
              {(() => {
                const emo = personaData.emotional_spending || {}
                const score = Math.round(emo.score || 0)
                const level = emo.level || "low"
                const flagged = score >= 40
                const components = emo.components || {}
                return (
                  <div className="persona-detail-card">
                    <h3>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                      Emotional Spending
                    </h3>
                    <div className={`persona-emotional-status ${flagged ? "flagged" : "clear"}`}>
                      <div className={`emotional-icon ${flagged ? "flagged" : "clear"}`}>
                        {flagged ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        )}
                      </div>
                      <div className={`emotional-info ${flagged ? "flagged" : "clear"}`}>
                        <h4>
                          {score}/100
                          <span className={`emotional-level-badge ${level}`}>{level}</span>
                        </h4>
                        <p>{emo.summary || "No data yet."}</p>
                      </div>
                    </div>
                    {Object.keys(components).length > 0 && (
                      <div className="emotional-components">
                        {[
                          ["stressed_share", "Stressed Spending"],
                          ["sad_share", "Sad Spending"],
                          ["negative_frequency", "Negative Mood Frequency"],
                          ["mood_overspend", "Mood-Driven Overspend"],
                        ].map(([key, label]) => (
                          <div key={key} className="emotional-component-row">
                            <span className="emotional-component-label">{label}</span>
                            <div className="emotional-component-bar-bg">
                              <div
                                className={`emotional-component-bar-fill ${(components[key] || 0) >= 50 ? "high" : ""}`}
                                style={{ width: `${Math.min(components[key] || 0, 100)}%` }}
                              />
                            </div>
                            <span className="emotional-component-value">{Math.round(components[key] || 0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {emo.reasons && emo.reasons.length > 0 && (
                      <div className="emotional-reasons">
                        {emo.reasons.map((reason, i) => (
                          <div key={i} className="emotional-reason-item">
                            <span className="emotional-reason-dot" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              
              <div className="persona-detail-card">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Analysis Info
                </h3>
                <div className="persona-feature-list">
                  <div className="persona-feature-item">
                    <span className="persona-feature-name">
                      Last analysed: {personaData.calculated_at
                        ? new Date(personaData.calculated_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })
                        : "N/A"}
                    </span>
                  </div>
                  <div className="persona-feature-item">
                    <span className="persona-feature-name">
                      Persona type: {activePersonaType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="persona-feature-item">
                    <span className="persona-feature-name">
                      Based on {expenseCount} tracked expenses
                    </span>
                  </div>
                </div>

                <button
                  className="confidence-toggle-btn"
                  onClick={() => setShowConfidence(!showConfidence)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  Confidence: {confidenceScore}%
                  <span className={`confidence-dot ${confidenceLevel}`} />
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showConfidence ? "rotated" : ""}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showConfidence && (
                  <div className="confidence-expanded">
                    <div className="confidence-label-text">
                      {confidenceLevel === "high" ? "Strong match" : confidenceLevel === "medium" ? "Moderate match" : "More data needed"}
                    </div>
                    <div className="confidence-meter">
                      <div className="confidence-bar-bg">
                        <div
                          className={`confidence-bar-fill ${confidenceLevel}`}
                          style={{ width: `${confidenceScore}%` }}
                        />
                      </div>
                      <div className="confidence-labels">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                      </div>
                    </div>
                    {confidenceData.data_sufficiency !== undefined && (
                      <div className="confidence-breakdown">
                        <div className="confidence-factor">
                          <span className="confidence-factor-label">Data Sufficiency</span>
                          <div className="confidence-factor-bar-bg">
                            <div className="confidence-factor-bar-fill" style={{ width: `${confidenceData.data_sufficiency}%` }} />
                          </div>
                          <span className="confidence-factor-value">{Math.round(confidenceData.data_sufficiency)}</span>
                        </div>
                        <div className="confidence-factor">
                          <span className="confidence-factor-label">Stability</span>
                          <div className="confidence-factor-bar-bg">
                            <div className="confidence-factor-bar-fill" style={{ width: `${confidenceData.stability}%` }} />
                          </div>
                          <span className="confidence-factor-value">{Math.round(confidenceData.stability)}</span>
                        </div>
                        <div className="confidence-factor">
                          <span className="confidence-factor-label">Cluster Fit</span>
                          <div className="confidence-factor-bar-bg">
                            <div className="confidence-factor-bar-fill" style={{ width: `${confidenceData.cluster_fit}%` }} />
                          </div>
                          <span className="confidence-factor-value">{Math.round(confidenceData.cluster_fit)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            
            <div className="persona-tips-card">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Personalised Tips
              </h3>
              <div className="persona-tips-list">
                {tips.map((tip, i) => (
                  <div key={i} className="persona-tip">
                    <span className="persona-tip-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="persona-footer">
              Persona analysis powered by machine learning
            </div>
          </>
        )}

        {showGuide && (
          <div className="persona-guide-overlay" onClick={() => setShowGuide(false)}>
            <div className="persona-guide-modal" onClick={(e) => e.stopPropagation()}>
              <div className="persona-guide-modal-header">
                <h3>Spending Persona Types</h3>
                <button className="persona-guide-close" onClick={() => setShowGuide(false)}>&times;</button>
              </div>
              <p className="persona-guide-subtitle">Our ML model classifies your behaviour into one of these personas based on your transaction patterns.</p>
              <div className="persona-types-grid">
                {Object.entries(PERSONA_LABELS).filter(([k]) => k !== "INSUFFICIENT_DATA").map(([key, label]) => (
                  <div
                    key={key}
                    className={`persona-type-card ${activePersonaType === key ? "current" : ""}`}
                  >
                    <div className="persona-type-card-header">
                      <span className="persona-type-dot" style={{ background: PERSONA_COLORS[key] || DEFAULT_COLOR }} />
                      <span className="persona-type-name">{label}</span>
                      {activePersonaType === key && <span className="persona-type-you">You</span>}
                    </div>
                    <p className="persona-type-desc">{PERSONA_DESCRIPTIONS[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAxisGuide && (
          <div className="persona-guide-overlay" onClick={() => setShowAxisGuide(false)}>
            <div className="persona-guide-modal" onClick={(e) => e.stopPropagation()}>
              <div className="persona-guide-modal-header">
                <h3>Behavioural Profile Axes</h3>
                <button className="persona-guide-close" onClick={() => setShowAxisGuide(false)}>&times;</button>
              </div>
              <p className="persona-guide-subtitle">Each axis on the radar chart measures a different dimension of your spending behaviour.</p>
              <div className="persona-types-grid">
                {Object.entries(SPIDER_AXIS_LABELS).map(([key, label]) => (
                  <div key={key} className="persona-type-card">
                    <div className="persona-type-card-header">
                      <span className="persona-type-dot" style={{ background: "var(--emerald-500)" }} />
                      <span className="persona-type-name">{label}</span>
                      {personaData?.spider_axes?.[key] !== undefined && (
                        <span className="axis-score-badge">{Math.round(personaData.spider_axes[key])}</span>
                      )}
                    </div>
                    <p className="persona-type-desc">{SPIDER_AXIS_DESCRIPTIONS[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
