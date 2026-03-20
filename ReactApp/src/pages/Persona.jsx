import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import Navbar from "../components/Navbar"
import Avatar, { PERSONA_STYLES, buildDiceBearUrl, HIJAB_COLORS, KIPPAH_COLORS, TURBAN_COLORS, TAQIYAH_COLORS, CROSS_COLORS } from "../components/Avatar"
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

// Available options catalog
const HAIR_OPTIONS = Array.from({ length: 26 }, (_, i) => `short${String(i + 1).padStart(2, "0")}`)
const LONG_HAIR_OPTIONS = Array.from({ length: 26 }, (_, i) => `long${String(i + 1).padStart(2, "0")}`)
const EYES_OPTIONS = Array.from({ length: 26 }, (_, i) => `variant${String(i + 1).padStart(2, "0")}`)
const EYEBROWS_OPTIONS = Array.from({ length: 15 }, (_, i) => `variant${String(i + 1).padStart(2, "0")}`)
const MOUTH_OPTIONS = Array.from({ length: 30 }, (_, i) => `variant${String(i + 1).padStart(2, "0")}`)
const GLASSES_OPTIONS = ["none", "variant01", "variant02", "variant03", "variant04", "variant05"]
const EARRINGS_OPTIONS = ["none", "variant01", "variant02", "variant03", "variant04", "variant05", "variant06"]
const FEATURES_OPTIONS = ["none", "birthmark", "blush", "freckles", "mustache01", "mustache02", "mustache03", "mustache04"]
const HIJAB_OPTIONS = ["none", ...Object.keys(HIJAB_COLORS)]
const HIJAB_LABELS = { none: "None", black: "Black", navy: "Navy", burgundy: "Burgundy", forest: "Forest", plum: "Plum", teal: "Teal", dusty_rose: "Dusty Rose", cream: "Cream" }
const KIPPAH_OPTIONS = ["none", ...Object.keys(KIPPAH_COLORS)]
const KIPPAH_LABELS = { none: "None", black: "Black", navy: "Navy", white: "White", royal_blue: "Royal Blue", burgundy: "Burgundy", silver: "Silver", cream: "Cream" }
const TURBAN_OPTIONS = ["none", ...Object.keys(TURBAN_COLORS)]
const TURBAN_LABELS = { none: "None", navy: "Navy", black: "Black", white: "White", royal_blue: "Royal Blue", maroon: "Maroon", orange: "Orange", forest: "Forest", cream: "Cream" }
const TAQIYAH_OPTIONS = ["none", ...Object.keys(TAQIYAH_COLORS)]
const TAQIYAH_LABELS = { none: "None", white: "White", cream: "Cream", black: "Black", grey: "Grey", brown: "Brown", navy: "Navy" }
const CROSS_OPTIONS = ["none", ...Object.keys(CROSS_COLORS)]
const CROSS_LABELS = { none: "None", gold: "Gold", silver: "Silver", rose_gold: "Rose Gold", bronze: "Bronze" }
const HAIR_COLORS = ["2c1b18", "4a312c", "724133", "a55728", "b58143", "c93305", "d6b370", "e8e1e1", "ecdcbf", "f59797", "f2d3b1", "000000", "6c4545", "cb6820"]
const SKIN_COLORS = ["f2d3b1", "ecad80", "d08b5b", "ae5d29"]
const BG_COLORS = ["f87171", "fb923c", "fbbf24", "34d399", "60a5fa", "a78bfa", "f472b6", "e5e7eb", "fecaca", "d1fae5", "dbeafe", "ede9fe"]
const FRAME_OPTIONS = ["none", "silver_ring", "gold_ring", "emerald_glow", "streak_flame"]

const FRAME_LABELS = {
  none: "None",
  silver_ring: "Silver Ring",
  gold_ring: "Gold Ring",
  emerald_glow: "Emerald Glow",
  streak_flame: "Streak Flame",
}

// Items requiring milestone unlock
const LOCKED_ITEMS = new Set([
  "glasses_variant02", "glasses_variant03", "glasses_variant04", "glasses_variant05",
  "earrings_variant01", "earrings_variant02", "earrings_variant03", "earrings_variant04", "earrings_variant05", "earrings_variant06",
  "features_birthmark", "features_blush", "features_freckles",
  "features_mustache01", "features_mustache02", "features_mustache03", "features_mustache04",
  "hair_long01", "hair_long02", "hair_long03", "hair_long04", "hair_long05",
  "frame_silver_ring", "frame_gold_ring", "frame_emerald_glow", "frame_streak_flame",
])

const SPIDER_AXIS_LABELS = {
  impulse: "Impulse",
  volatility: "Volatility",
  budget_discipline: "Budget Discipline",
  weekend_bias: "Weekend Bias",
  late_night_activity: "Late Night",
  category_concentration: "Category Focus",
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

function formatRewardName(key) {
  return key.replace(/^(glasses|earrings|features|frame|hair)_/, "").replace(/([a-z])(\d)/g, "$1 $2").replace(/variant/i, "Style ")
}

function RadarChart({ axes, size = 280 }) {
  const keys = Object.keys(SPIDER_AXIS_LABELS)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.34
  const n = keys.length
  const angleStep = (2 * Math.PI) / n
  const offsetAngle = -Math.PI / 2

  const point = (i, pct) => {
    const a = offsetAngle + i * angleStep
    return [cx + r * (pct / 100) * Math.cos(a), cy + r * (pct / 100) * Math.sin(a)]
  }

  const rings = [25, 50, 75, 100]

  const dataPoints = keys.map((k, i) => point(i, axes[k] || 0))
  const polygon = dataPoints.map((p) => p.join(",")).join(" ")

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart-svg">
      {rings.map((pct) => {
        const pts = keys.map((_, i) => point(i, pct)).map((p) => p.join(",")).join(" ")
        return <polygon key={pct} points={pts} fill="none" stroke="var(--gray-200)" strokeWidth="1" />
      })}
      {keys.map((_, i) => {
        const [ex, ey] = point(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="var(--gray-200)" strokeWidth="1" />
      })}
      <polygon points={polygon} fill="rgba(16,185,129,0.18)" stroke="var(--emerald-500)" strokeWidth="2" />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="var(--emerald-500)" />
      ))}
      {keys.map((k, i) => {
        const labelR = r + 24
        const a = offsetAngle + i * angleStep
        const lx = cx + labelR * Math.cos(a)
        const ly = cy + labelR * Math.sin(a)
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

function DisciplineCard({ discipline }) {
  if (!discipline || discipline.discipline_score === undefined) return null
  const score = Math.round(discipline.discipline_score)
  const trendIcon = discipline.trend === "improving" ? "\u2191" : discipline.trend === "worsening" ? "\u2193" : "\u2192"
  const trendClass = discipline.trend === "improving" ? "improving" : discipline.trend === "worsening" ? "worsening" : "stable"

  return (
    <div className="persona-detail-card discipline-card">
      <h3>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Discipline &amp; Habits
      </h3>
      <div className="discipline-body">
        <div className="discipline-score-ring">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--gray-100)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="var(--emerald-500)" strokeWidth="6"
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
            />
          </svg>
          <span className="discipline-score-number">{score}</span>
        </div>
        <div className="discipline-details">
          <div className="discipline-streak">
            <span className="discipline-streak-value">{discipline.streak_days_in_budget || 0}</span>
            <span className="discipline-streak-label">day streak</span>
          </div>
          <div className="discipline-streak">
            <span className="discipline-streak-value">{discipline.streak_weeks_stable || 0}</span>
            <span className="discipline-streak-label">stable weeks</span>
          </div>
          <div className={`discipline-trend ${trendClass}`}>
            <span className="discipline-trend-arrow">{trendIcon}</span>
            <span>{discipline.trend}</span>
          </div>
        </div>
      </div>
      {discipline.feedback_message && (
        <p className="discipline-feedback">{discipline.feedback_message}</p>
      )}
    </div>
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

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [tab, setTab] = useState("hair")
  const [editingOptions, setEditingOptions] = useState({})
  const [selectedFrame, setSelectedFrame] = useState(null)
  const [unlockedItems, setUnlockedItems] = useState(new Set())
  const [milestones, setMilestones] = useState([])
  const [saving, setSaving] = useState(false)
  const [analysing, setAnalysing] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadPersonaData()
      loadExpenseCount()
      loadAvatarData()
    }
  }, [user?.id])

  // Auto-analyse when user has enough expenses but no persona yet
  useEffect(() => {
    if (loading || analysing) return
    const needsAnalysis = !personaData || personaData.persona_type === "INSUFFICIENT_DATA"
    if (needsAnalysis && expenseCount >= 10) {
      runAnalysis()
    }
  }, [loading, personaData, expenseCount])

  const runAnalysis = async () => {
    setAnalysing(true)
    try {
      await api.post(`/ml/analyse/${user.id}`)
      const [personaRes, nudgesRes] = await Promise.all([
        api.get(`/ml/persona/${user.id}`),
        api.get(`/ml/nudges/${user.id}`),
      ])
      setPersonaData(personaRes.data)
      setNudgesData(nudgesRes.data.nudges || [])
    } catch {
      // analysis failed, stay in current state
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
      setPersonaData(personaRes.data)
      setNudgesData(nudgesRes.data.nudges || [])
    } catch {
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

  const loadAvatarData = async () => {
    try {
      const [avatarRes, milestoneRes] = await Promise.all([
        api.get(`/avatar?userId=${user.id}`),
        api.get(`/avatar/milestones?userId=${user.id}`),
      ])
      const opts = avatarRes.data.equippedOptions
      if (opts && opts !== "{}") {
        setEditingOptions(JSON.parse(opts))
      }
      setSelectedFrame(avatarRes.data.equippedFrame || null)
      const items = milestoneRes.data.unlockedItems
      setUnlockedItems(new Set(Array.isArray(items) ? items : []))
      setMilestones(milestoneRes.data.milestones || [])
    } catch {
      // silently ignore, backend may not be ready
    }
  }

  const isItemLocked = (itemKey) => {
    if (!LOCKED_ITEMS.has(itemKey)) return false
    return !unlockedItems.has(itemKey)
  }

  const updateOption = (key, value) => {
    setEditingOptions((prev) => {
      const next = { ...prev }
      if (value === "none" || value === null) {
        delete next[key]
        // Clear probability params too
        if (key === "glasses") delete next.glassesProbability
      } else {
        next[key] = value
      }
      return next
    })
  }

  const saveCustomization = async () => {
    setSaving(true)
    try {
      await api.put(`/avatar?userId=${user.id}`, {
        equippedOptions: editingOptions,
        equippedFrame: selectedFrame,
      })
    } catch (e) {
      console.error("Failed to save avatar:", e)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = () => {
    setEditingOptions({})
    setSelectedFrame(null)
  }

  const getPreviewUrl = (optionKey, optionValue) => {
    const base = personaData ? (PERSONA_STYLES[personaData.persona_type] || {}) : {}
    const preview = { ...base, ...editingOptions, [optionKey]: optionValue }
    if (optionKey === "glasses" && optionValue !== "none") preview.glassesProbability = "100"
    if (optionKey === "earrings" && optionValue !== "none") preview.earringsProbability = "100"
    if (optionKey === "features" && optionValue !== "none") preview.featuresProbability = "100"
    const params = new URLSearchParams({ seed: `user_${user.id}`, size: "48" })
    Object.entries(preview).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") params.append(k, v)
    })
    return `https://api.dicebear.com/9.x/adventurer/svg?${params.toString()}`
  }

  const activePersonaType = personaData ? (personaData.persona_primary || personaData.persona_type) : null

  const mergedOptions = personaData
    ? { ...PERSONA_STYLES[personaData.persona_type], ...editingOptions }
    : editingOptions

  const confidenceData = personaData?.confidence_data || {}
  const confidenceScore = confidenceData.score !== undefined ? Math.round(confidenceData.score) : (personaData ? Math.round(personaData.confidence * 100) : 0)
  const confidenceLevel = (personaData?.confidence_level || confidenceData.level || (confidenceScore >= 70 ? "High" : confidenceScore >= 40 ? "Medium" : "Low")).toLowerCase()
  const tips = activePersonaType ? (PERSONA_TIPS[activePersonaType] || PERSONA_TIPS[personaData?.persona_type] || DEFAULT_TIPS) : []
  const accentColor = activePersonaType ? (PERSONA_COLORS[activePersonaType] || DEFAULT_COLOR) : DEFAULT_COLOR
  const displayLabel = activePersonaType ? (PERSONA_LABELS[activePersonaType] || personaData?.persona_label || activePersonaType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())) : ""

  const discipline = personaData?.discipline || {}
  const disciplineScore = Math.round(discipline.discipline_score || 0)

  const renderTabContent = () => {
    switch (tab) {
      case "hair":
        return [...HAIR_OPTIONS, ...LONG_HAIR_OPTIONS].map((h) => {
          const itemKey = `hair_${h}`
          const locked = isItemLocked(itemKey)
          const selected = mergedOptions.hair === h
          return (
            <button
              key={h}
              className={`avatar-option ${selected ? "selected" : ""} ${locked ? "locked" : ""}`}
              onClick={() => !locked && updateOption("hair", h)}
              disabled={locked}
            >
              {locked && (
                <span className="lock-overlay">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
              )}
              <img src={getPreviewUrl("hair", h)} alt={h} loading="lazy" />
            </button>
          )
        })
      case "eyes":
        return EYES_OPTIONS.map((e) => (
          <button
            key={e}
            className={`avatar-option ${mergedOptions.eyes === e ? "selected" : ""}`}
            onClick={() => updateOption("eyes", e)}
          >
            <img src={getPreviewUrl("eyes", e)} alt={e} loading="lazy" />
          </button>
        ))
      case "brows":
        return EYEBROWS_OPTIONS.map((eb) => (
          <button
            key={eb}
            className={`avatar-option ${mergedOptions.eyebrows === eb ? "selected" : ""}`}
            onClick={() => updateOption("eyebrows", eb)}
          >
            <img src={getPreviewUrl("eyebrows", eb)} alt={eb} loading="lazy" />
          </button>
        ))
      case "mouth":
        return MOUTH_OPTIONS.map((m) => (
          <button
            key={m}
            className={`avatar-option ${mergedOptions.mouth === m ? "selected" : ""}`}
            onClick={() => updateOption("mouth", m)}
          >
            <img src={getPreviewUrl("mouth", m)} alt={m} loading="lazy" />
          </button>
        ))
      case "accessories":
        return (
          <>
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>Glasses</div>
            {GLASSES_OPTIONS.map((g) => {
              const itemKey = g === "none" ? null : `glasses_${g}`
              const locked = itemKey ? isItemLocked(itemKey) : false
              const current = mergedOptions.glasses || "none"
              return (
                <button
                  key={`g-${g}`}
                  className={`avatar-option ${current === g || (g === "none" && !mergedOptions.glasses) ? "selected" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => !locked && updateOption("glasses", g)}
                  disabled={locked}
                >
                  {locked && (
                    <span className="lock-overlay">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                  <img src={getPreviewUrl("glasses", g === "none" ? "" : g)} alt={g} loading="lazy" />
                </button>
              )
            })}
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Earrings</div>
            {EARRINGS_OPTIONS.map((e) => {
              const itemKey = e === "none" ? null : `earrings_${e}`
              const locked = itemKey ? isItemLocked(itemKey) : false
              const current = mergedOptions.earrings || "none"
              return (
                <button
                  key={`e-${e}`}
                  className={`avatar-option ${current === e || (e === "none" && !mergedOptions.earrings) ? "selected" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => !locked && updateOption("earrings", e)}
                  disabled={locked}
                >
                  {locked && (
                    <span className="lock-overlay">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                  <img src={getPreviewUrl("earrings", e === "none" ? "" : e)} alt={e} loading="lazy" />
                </button>
              )
            })}
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Features</div>
            {FEATURES_OPTIONS.map((f) => {
              const itemKey = f === "none" ? null : `features_${f}`
              const locked = itemKey ? isItemLocked(itemKey) : false
              const current = mergedOptions.features || "none"
              return (
                <button
                  key={`f-${f}`}
                  className={`avatar-option ${current === f || (f === "none" && !mergedOptions.features) ? "selected" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => !locked && updateOption("features", f)}
                  disabled={locked}
                >
                  {locked && (
                    <span className="lock-overlay">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  )}
                  <img src={getPreviewUrl("features", f === "none" ? "" : f)} alt={f} loading="lazy" />
                </button>
              )
            })}
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12 }}>Religious &amp; Cultural</div>
            <div style={{ gridColumn: "1 / -1", fontSize: 10, color: "var(--gray-400)", marginTop: -4, marginBottom: 4 }}>Headwear items are mutually exclusive — selecting one removes the others.</div>

            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "var(--gray-500)", marginTop: 4 }}>Hijab</div>
            {HIJAB_OPTIONS.map((h) => {
              const current = editingOptions.hijab || "none"
              return (
                <button
                  key={`hijab-${h}`}
                  className={`avatar-option color-swatch ${current === h ? "selected" : ""}`}
                  onClick={() => {
                    updateOption("kippah", "none"); updateOption("turban", "none"); updateOption("taqiyah", "none")
                    updateOption("hijab", h)
                  }}
                  title={HIJAB_LABELS[h]}
                >
                  {h === "none" ? (
                    <span className="color-circle color-circle-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </span>
                  ) : (
                    <span className="color-circle" style={{ background: HIJAB_COLORS[h] }} />
                  )}
                  <span style={{ fontSize: 9, color: "var(--gray-600)", marginTop: 2 }}>{HIJAB_LABELS[h]}</span>
                </button>
              )
            })}

            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "var(--gray-500)", marginTop: 8 }}>Kippah</div>
            {KIPPAH_OPTIONS.map((k) => {
              const current = editingOptions.kippah || "none"
              return (
                <button
                  key={`kippah-${k}`}
                  className={`avatar-option color-swatch ${current === k ? "selected" : ""}`}
                  onClick={() => {
                    updateOption("hijab", "none"); updateOption("turban", "none"); updateOption("taqiyah", "none")
                    updateOption("kippah", k)
                  }}
                  title={KIPPAH_LABELS[k]}
                >
                  {k === "none" ? (
                    <span className="color-circle color-circle-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </span>
                  ) : (
                    <span className="color-circle" style={{ background: KIPPAH_COLORS[k] }} />
                  )}
                  <span style={{ fontSize: 9, color: "var(--gray-600)", marginTop: 2 }}>{KIPPAH_LABELS[k]}</span>
                </button>
              )
            })}

            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "var(--gray-500)", marginTop: 8 }}>Turban</div>
            {TURBAN_OPTIONS.map((t) => {
              const current = editingOptions.turban || "none"
              return (
                <button
                  key={`turban-${t}`}
                  className={`avatar-option color-swatch ${current === t ? "selected" : ""}`}
                  onClick={() => {
                    updateOption("hijab", "none"); updateOption("kippah", "none"); updateOption("taqiyah", "none")
                    updateOption("turban", t)
                  }}
                  title={TURBAN_LABELS[t]}
                >
                  {t === "none" ? (
                    <span className="color-circle color-circle-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </span>
                  ) : (
                    <span className="color-circle" style={{ background: TURBAN_COLORS[t] }} />
                  )}
                  <span style={{ fontSize: 9, color: "var(--gray-600)", marginTop: 2 }}>{TURBAN_LABELS[t]}</span>
                </button>
              )
            })}

            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "var(--gray-500)", marginTop: 8 }}>Taqiyah</div>
            {TAQIYAH_OPTIONS.map((t) => {
              const current = editingOptions.taqiyah || "none"
              return (
                <button
                  key={`taqiyah-${t}`}
                  className={`avatar-option color-swatch ${current === t ? "selected" : ""}`}
                  onClick={() => {
                    updateOption("hijab", "none"); updateOption("kippah", "none"); updateOption("turban", "none")
                    updateOption("taqiyah", t)
                  }}
                  title={TAQIYAH_LABELS[t]}
                >
                  {t === "none" ? (
                    <span className="color-circle color-circle-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </span>
                  ) : (
                    <span className="color-circle" style={{ background: TAQIYAH_COLORS[t] }} />
                  )}
                  <span style={{ fontSize: 9, color: "var(--gray-600)", marginTop: 2 }}>{TAQIYAH_LABELS[t]}</span>
                </button>
              )
            })}

            <div style={{ gridColumn: "1 / -1", fontSize: 10, fontWeight: 600, color: "var(--gray-500)", marginTop: 8 }}>Cross Necklace</div>
            {CROSS_OPTIONS.map((c) => {
              const current = editingOptions.crossNecklace || "none"
              return (
                <button
                  key={`cross-${c}`}
                  className={`avatar-option color-swatch ${current === c ? "selected" : ""}`}
                  onClick={() => updateOption("crossNecklace", c)}
                  title={CROSS_LABELS[c]}
                >
                  {c === "none" ? (
                    <span className="color-circle color-circle-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </span>
                  ) : (
                    <span className="color-circle" style={{ background: CROSS_COLORS[c] }} />
                  )}
                  <span style={{ fontSize: 9, color: "var(--gray-600)", marginTop: 2 }}>{CROSS_LABELS[c]}</span>
                </button>
              )
            })}
          </>
        )
      case "colors":
        return (
          <>
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>Hair Colour</div>
            {HAIR_COLORS.map((c) => (
              <button
                key={`hc-${c}`}
                className={`avatar-option color-swatch ${mergedOptions.hairColor === c ? "selected" : ""}`}
                onClick={() => updateOption("hairColor", c)}
              >
                <span className="color-circle" style={{ background: `#${c}` }} />
              </button>
            ))}
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Skin Tone</div>
            {SKIN_COLORS.map((c) => (
              <button
                key={`sc-${c}`}
                className={`avatar-option color-swatch ${mergedOptions.skinColor === c ? "selected" : ""}`}
                onClick={() => updateOption("skinColor", c)}
              >
                <span className="color-circle" style={{ background: `#${c}` }} />
              </button>
            ))}
            <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Background</div>
            {BG_COLORS.map((c) => (
              <button
                key={`bg-${c}`}
                className={`avatar-option color-swatch ${mergedOptions.backgroundColor === c ? "selected" : ""}`}
                onClick={() => updateOption("backgroundColor", c)}
              >
                <span className="color-circle" style={{ background: `#${c}` }} />
              </button>
            ))}
          </>
        )
      case "frames":
        return FRAME_OPTIONS.map((f) => {
          const itemKey = f === "none" ? null : `frame_${f}`
          const locked = itemKey ? isItemLocked(itemKey) : false
          const selected = (selectedFrame || "none") === f
          return (
            <button
              key={f}
              className={`avatar-option frame-option ${selected ? "selected" : ""} ${locked ? "locked" : ""}`}
              onClick={() => !locked && setSelectedFrame(f === "none" ? null : f)}
              disabled={locked}
            >
              {locked && (
                <span className="lock-overlay">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
              )}
              <div className={`frame-preview ${f !== "none" ? `avatar-frame-${f}` : ""}`} />
              <span style={{ fontSize: 10, color: "var(--gray-600)", marginTop: 2 }}>{FRAME_LABELS[f]}</span>
            </button>
          )
        })
      default:
        return null
    }
  }

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
              {personaData
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
          </div>
        ) : (
          <>
            {/* Provisional Banner */}
            {personaData.provisional && (
              <div className="persona-provisional-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>
                  <strong>Provisional Persona</strong>
                  <p>Based on {expenseCount} expenses. {expenseCount < 20
                    ? `Log ${20 - expenseCount} more expenses over at least 2 weeks for a full persona.`
                    : "Keep logging expenses over a longer period for a more stable persona."}</p>
                </div>
              </div>
            )}

            {/* Profile Card */}
            <div className="persona-profile-card">
              <div className="persona-profile-top">
                <div
                  className={`persona-avatar-wrapper ${selectedFrame ? `avatar-frame-${selectedFrame}` : ""}`}
                  style={!selectedFrame ? { boxShadow: `0 8px 24px ${accentColor}30` } : undefined}
                >
                  <Avatar user={user} size="xl" persona={personaData.persona_type} customOptions={editingOptions} />
                </div>
                <div className="persona-profile-info">
                  <span className={`persona-type-label persona-type-${activePersonaType}`}>
                    <span className="dot" />
                    {displayLabel}
                  </span>
                  <h2>{user.name}</h2>
                  <p className="persona-description">{personaData.description}</p>
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
                <div className="persona-stat">
                  <div className="persona-stat-value">{disciplineScore}</div>
                  <div className="persona-stat-label">Discipline Score</div>
                </div>
              </div>
            </div>

            {/* Detail Cards */}
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

              <DisciplineCard discipline={personaData.discipline} />

              {/* Avatar Editor */}
              <div className="persona-detail-card avatar-editor-card">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Customise Avatar
                  <button className="avatar-edit-toggle" onClick={() => setEditorOpen(!editorOpen)}>
                    {editorOpen ? "Close" : "Edit"}
                  </button>
                </h3>

                {editorOpen && (
                  <div className="avatar-editor">
                    <div className="avatar-editor-preview">
                      <div className={`avatar-editor-preview-inner ${selectedFrame ? `avatar-frame-${selectedFrame}` : ""}`}>
                        <Avatar user={user} size="xl" persona={personaData.persona_type} customOptions={editingOptions} />
                      </div>
                    </div>

                    <div className="avatar-editor-tabs">
                      {[
                        ["hair", "Hair"],
                        ["eyes", "Eyes"],
                        ["brows", "Brows"],
                        ["mouth", "Mouth"],
                        ["accessories", "Accessories"],
                        ["colors", "Colours"],
                        ["frames", "Frames"],
                      ].map(([key, label]) => (
                        <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="avatar-editor-options">{renderTabContent()}</div>

                    <div className="avatar-editor-actions">
                      <button className="avatar-reset-btn" onClick={resetToDefault}>
                        Reset to Default
                      </button>
                      <button className="avatar-save-btn" onClick={saveCustomization} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Milestones */}
              <div className="persona-detail-card milestones-card">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18" />
                    <path d="M6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                  </svg>
                  Avatar Milestones
                </h3>
                <div className="milestones-list">
                  {milestones.map((m) => {
                    const progressPct = Math.min((m.current / m.threshold) * 100, 100)
                    return (
                      <div key={m.id} className={`milestone-item ${m.achieved ? "achieved" : ""}`}>
                        <div className="milestone-icon">
                          {m.achieved ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                        </div>
                        <div className="milestone-info">
                          <span className="milestone-name">{m.name}</span>
                          <span className="milestone-desc">{m.description}</span>
                          <div className="milestone-progress-bar">
                            <div className="milestone-progress-fill" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="milestone-progress-text">
                            {m.current} / {m.threshold} {m.type === "expense_count" ? "expenses" : "months"}
                          </span>
                        </div>
                        <div className="milestone-rewards">
                          {m.rewards.map((r) => (
                            <span key={r} className="milestone-reward-badge">{formatRewardName(r)}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="persona-detail-card">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  Confidence Score
                </h3>
                <div className="confidence-value">
                  {confidenceScore}%
                  <span className={`confidence-level-inline ${confidenceLevel}`}>{confidenceLevel}</span>
                </div>
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

              {/* Persona Explanation */}
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

              {/* Emotional Spender */}
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
                <div className={`persona-emotional-status ${personaData.emotional_spender_flag ? "flagged" : "clear"}`}>
                  <div className={`emotional-icon ${personaData.emotional_spender_flag ? "flagged" : "clear"}`}>
                    {personaData.emotional_spender_flag ? (
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
                  <div className={`emotional-info ${personaData.emotional_spender_flag ? "flagged" : "clear"}`}>
                    <h4>{personaData.emotional_spender_flag ? "Emotional Spending Detected" : "No Emotional Spending"}</h4>
                    <p>
                      {personaData.emotional_spender_flag
                        ? "Your spending tends to increase when you're stressed. Try mindful spending techniques."
                        : "Your spending isn't significantly influenced by your mood. Keep it up!"}
                    </p>
                  </div>
                </div>
              </div>

              <NudgeList nudges={nudgesData} />

              {/* Analysis Info */}
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
              </div>
            </div>

            {/* Tips Card */}
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
      </div>
    </div>
  )
}
