import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import Navbar from "../components/Navbar"
import { fmt } from "../utils/format"
import "./css/Budget.css"

const getCurrentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const formatMonth = (monthStr) => {
  if (!monthStr) return ""
  const [year, month] = monthStr.split("-")
  const date = new Date(year, parseInt(month) - 1)
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

const categoryColors = {
  Food: "#10b981",
  Travel: "#3b82f6",
  Education: "#8b5cf6",
  Leisure: "#f59e0b",
  Other: "#6b7280"
}

const TIER_ORDER = ["FLEXIBLE", "DISCRETIONARY"]
const TIER_LABELS = { FLEXIBLE: "Flexible Spending", DISCRETIONARY: "Discretionary" }
const TIER_COLORS = { FLEXIBLE: "#10b981", DISCRETIONARY: "#f59e0b" }

const DEFAULT_TIERS = {
  Food: "FLEXIBLE", Travel: "FLEXIBLE", Education: "FLEXIBLE",
  Leisure: "DISCRETIONARY", Other: "FLEXIBLE"
}

const LAYER_LABELS = {
  CAPACITY: "Financial Capacity",
  GOALS: "Plan Contributions",
  CONTEXT: "Context Modifiers",
  PERSONA: "Persona Modifiers",
  ALLOCATION: "Adaptive Allocation",
  REALLOCATION: "Reallocation Suggestions"
}

const LAYER_COLORS = {
  CAPACITY: "#3b82f6",
  GOALS: "#8b5cf6",
  CONTEXT: "#f59e0b",
  PERSONA: "#ec4899",
  ALLOCATION: "#10b981",
  REALLOCATION: "#ef4444"
}

const PERSONA_MODE_COLORS = {
  ERRATIC_SPENDER: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#dc2626" },
  BIG_SPENDER: { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.25)", text: "#db2777" },
  BALANCED_SPENDER: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", text: "#059669" },
  NEUTRAL: { bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.25)", text: "#4b5563" }
}

const GUIDANCE_STYLE_LABELS = {
  CORRECTIVE: "Corrective",
  CAUTIONARY: "Cautionary",
  POSITIVE: "Balanced",
  NEUTRAL: "Standard"
}

const directionLabels = { INCREASE: "Increase", REDUCE: "Reduce", PROTECT: "Protect" }
const directionIcons = { INCREASE: "\u2191", REDUCE: "\u2193", PROTECT: "\u2194" }
const directionClass = { INCREASE: "positive", REDUCE: "negative", PROTECT: "neutral" }

export default function Budget() {
  const { user } = useAuth()
  const currentMonth = getCurrentMonth()

  const [budget, setBudget] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [categoryLimits, setCategoryLimits] = useState({})
  const [totalBudget, setTotalBudget] = useState(0)

  const [billsTotal, setBillsTotal] = useState(0)
  const [subsTotal, setSubsTotal] = useState(0)

  // UI toggles
  const [showUnused, setShowUnused] = useState(false)
  const [showExplanations, setShowExplanations] = useState(false)
  const [showPlans, setShowPlans] = useState(true)
  const [showCategories, setShowCategories] = useState(true)
  const [showWaterfall, setShowWaterfall] = useState(false)
  const [showInsights, setShowInsights] = useState(true)

  // Engine state
  const [engineMode, setEngineMode] = useState(null)
  const [layerBreakdown, setLayerBreakdown] = useState(null)
  const [explanationTrace, setExplanationTrace] = useState([])


  // Persona Layer 5
  const [personaProfile, setPersonaProfile] = useState(null)

  // Active plans (outcomes + priorities)
  const [allPlans, setAllPlans] = useState([])

  // AI Insights
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState("")

  const loadData = async (autoApply = false) => {
    if (!user?.id) return
    setLoading(true)
    setErrorMsg("")

    try {
      const [budgetRes, suggestRes, expenseRes, billsSummaryRes, subsRes] = await Promise.all([
        api.get(`/budgets/current?userId=${user.id}`).catch(() => ({ data: null })),
        api.get(`/budgets/suggest?userId=${user.id}`),
        api.get(`/expenses?userId=${user.id}`),
        api.get(`/bills/summary?userId=${user.id}`).catch(() => ({ data: null })),
        api.get(`/subscriptions?userId=${user.id}`).catch(() => ({ data: [] }))
      ])

      const sg = suggestRes.data
      setSuggestion(sg)
      setEngineMode(sg.engineMode || null)
      setExplanationTrace(sg.explanationTrace || [])
      setLayerBreakdown({
        layer1: sg.layer1_capacity,
        layer2: sg.layer2_goals,
        layer3: sg.layer3_context,
        layer4: sg.layer4_allocation,
        layer5: sg.layer5_persona
      })

      if (sg.layer5_persona) {
        setPersonaProfile(sg.layer5_persona)
      }
      setExpenses(Array.isArray(expenseRes.data) ? expenseRes.data : [])

      setBillsTotal(billsSummaryRes.data?.totalMonthlyBills || 0)

      const activeSubs = Array.isArray(subsRes.data) ? subsRes.data.filter(s => s.status === "ACTIVE") : []
      const monthlySubsTotal = activeSubs.reduce((sum, sub) => {
        if (sub.billingCycle === "MONTHLY") return sum + sub.cost
        if (sub.billingCycle === "YEARLY") return sum + sub.cost / 12
        if (sub.billingCycle === "WEEKLY") return sum + sub.cost * 4.33
        return sum
      }, 0)
      setSubsTotal(Math.round(monthlySubsTotal * 100) / 100)

      // Effective spending budget: total capacity minus goal contributions
      const sgCapacity = sg?.totalCapacity || sg?.totalBudget || 0
      const sgGoals = sg?.monthlyGoalAllocations || 0
      const effectiveBudget = Math.round(Math.max(0, sgCapacity - sgGoals) * 100) / 100
      const suggestedLimits = sg.categoryLimits || {}

      if (budgetRes.data) {
        const currentBudget = budgetRes.data

        // Check if budget total or category limits changed
        const currentLimits = JSON.parse(currentBudget.categoryLimits || "{}")
        const limitsChanged = Object.keys(suggestedLimits).some(
          cat => Math.abs((suggestedLimits[cat] || 0) - (currentLimits[cat] || 0)) > 0.01
        )
        const totalChanged = Math.abs(currentBudget.totalBudget - effectiveBudget) > 0.01

        if (autoApply && effectiveBudget > 0 && (totalChanged || limitsChanged)) {
          const bufAmt = sg.bufferAmount || Math.round(effectiveBudget * 0.05 * 100) / 100
          const limitsTotal = Object.values(suggestedLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
          const safeToSpend = Math.max(0, effectiveBudget - limitsTotal - bufAmt)

          const payload = {
            month: currentMonth,
            totalBudget: effectiveBudget,
            categoryLimits: JSON.stringify(suggestedLimits),
            safeToSpend,
            bufferAmount: bufAmt,
            bufferRemaining: bufAmt,
            categoryMeta: JSON.stringify(sg.categoryExplanations || {}),
            contextMeta: JSON.stringify({
              contextImpact: sg.contextImpact || {},
              totalContextShift: sg.totalContextShift || 0,
              contextBreakdown: sg.contextBreakdown || []
            })
          }

          try {
            await api.put(`/budgets/${currentBudget.id}?userId=${user.id}`, payload)
            setBudget({ ...currentBudget, totalBudget: effectiveBudget })
            setCategoryLimits(suggestedLimits)
            setTotalBudget(effectiveBudget)
          } catch {
            setBudget(currentBudget)
            setCategoryLimits(JSON.parse(currentBudget.categoryLimits || "{}"))
            setTotalBudget(currentBudget.totalBudget)
          }
        } else {
          setBudget(currentBudget)
          setCategoryLimits(JSON.parse(currentBudget.categoryLimits || "{}"))
          setTotalBudget(currentBudget.totalBudget)
        }

        try {
          const statusRes = await api.get(`/budgets/status?userId=${user.id}`)
          setBudgetStatus(statusRes.data)
        } catch { setBudgetStatus(null) }
      } else if (autoApply && sg && effectiveBudget > 0) {
        const bufferAmount = sg.bufferAmount || Math.round(effectiveBudget * 0.05 * 100) / 100
        const limitsTotal = Object.values(suggestedLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
        const safeToSpend = Math.max(0, effectiveBudget - limitsTotal - bufferAmount)

        const payload = {
          month: currentMonth,
          totalBudget: effectiveBudget,
          categoryLimits: JSON.stringify(suggestedLimits),
          safeToSpend,
          bufferAmount,
          bufferRemaining: bufferAmount,
          categoryMeta: JSON.stringify(sg.categoryExplanations || {}),
          contextMeta: JSON.stringify({
            contextImpact: sg.contextImpact || {},
            totalContextShift: sg.totalContextShift || 0,
            contextBreakdown: sg.contextBreakdown || []
          })
        }

        const created = await api.post(`/budgets?userId=${user.id}`, payload)
        setBudget(created.data)
        setCategoryLimits(suggestedLimits)
        setTotalBudget(effectiveBudget)
        try {
          const statusRes = await api.get(`/budgets/status?userId=${user.id}`)
          setBudgetStatus(statusRes.data)
        } catch { setBudgetStatus(null) }
      } else {
        setBudget(null)
        setCategoryLimits({})
        setTotalBudget(0)
        setBudgetStatus(null)
      }
    } catch (err) {
      setErrorMsg("Could not load budget data.")
    } finally {
      setLoading(false)
    }
  }

  const loadContexts = async () => {
    if (!user?.id) return
    try {
      const res = await api.get(`/plans/active?userId=${user.id}`)
      const plans = res.data || []
      setAllPlans(plans)
    } catch {}
  }

  useEffect(() => {
    if (user?.id) {
      loadData(true)
      loadContexts()
    }
  }, [user?.id])

  const outcomePlans = useMemo(() => allPlans.filter(p => p.family === "OUTCOME_PLAN"), [allPlans])
  const priorityPlans = useMemo(() => allPlans.filter(p => p.family === "PRIORITY_PLAN"), [allPlans])

  const monthExpenses = useMemo(() => {
    return expenses.filter(exp => exp.date && exp.date.startsWith(currentMonth))
  }, [expenses, currentMonth])

  const spentByCategory = useMemo(() => {
    const spent = {}
    monthExpenses.forEach(exp => {
      const cat = exp.category || "Other"
      spent[cat] = (spent[cat] || 0) + Number(exp.amount || 0)
    })
    return spent
  }, [monthExpenses])

  const totalSpent = useMemo(() => {
    return monthExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [monthExpenses])

  const remainingBudget = useMemo(() => totalBudget - totalSpent, [totalBudget, totalSpent])

  const overallStatus = useMemo(() => {
    if (totalBudget <= 0) return "none"
    const percent = (totalSpent / totalBudget) * 100
    if (percent >= 100) return "exceeded"
    if (percent >= (personaProfile?.warningThreshold ?? 0.80) * 100) return "warning"
    return "on-track"
  }, [totalSpent, totalBudget, personaProfile])

  const getCategoryTier = (cat) => {
    if (budgetStatus?.categories?.[cat]?.tier) return budgetStatus.categories[cat].tier
    return suggestion?.categoryTiers?.[cat] || DEFAULT_TIERS[cat] || "FLEXIBLE"
  }

  const categoriesByTier = useMemo(() => {
    const active = budgetStatus?.activeCategories || Object.keys(categoryLimits)
    const grouped = {}
    TIER_ORDER.forEach(tier => { grouped[tier] = [] })
    active.forEach(cat => {
      const tier = getCategoryTier(cat)
      if (!grouped[tier]) grouped[tier] = []
      grouped[tier].push(cat)
    })
    return grouped
  }, [budgetStatus, categoryLimits, suggestion])

  const unusedCategories = budgetStatus?.unusedBudgetedCategories || []

  const handleLimitChange = (category, value) => {
    setCategoryLimits(prev => ({ ...prev, [category]: Number(value) || 0 }))
  }

  const handleSave = async () => {
    setErrorMsg("")
    setSaving(true)
    const limitsTotal = Object.values(categoryLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
    const safeToSpend = Math.max(0, totalBudget - limitsTotal)

    const payload = {
      month: currentMonth,
      totalBudget,
      categoryLimits: JSON.stringify(categoryLimits),
      safeToSpend
    }

    try {
      if (budget?.id) {
        await api.put(`/budgets/${budget.id}?userId=${user.id}`, payload)
      } else {
        await api.post(`/budgets?userId=${user.id}`, payload)
      }
      await loadData()
      setEditMode(false)
    } catch (err) {
      setErrorMsg("Save failed.")
    } finally {
      setSaving(false)
    }
  }

  const handleResetToSuggestion = async () => {
    if (!suggestion || !budget?.id) return
    setErrorMsg("")
    setSaving(true)

    const suggestedLimits = suggestion.categoryLimits || {}
    const suggestedTotal = suggestion.totalBudget || 0
    const bufferAmount = suggestion.bufferAmount || Math.round(suggestedTotal * 0.05 * 100) / 100
    const limitsTotal = Object.values(suggestedLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
    const safeToSpend = Math.max(0, suggestedTotal - limitsTotal - bufferAmount)

    const payload = {
      month: currentMonth,
      totalBudget: suggestedTotal,
      categoryLimits: JSON.stringify(suggestedLimits),
      safeToSpend,
      bufferAmount,
      bufferRemaining: bufferAmount
    }

    try {
      await api.put(`/budgets/${budget.id}?userId=${user.id}`, payload)
      await loadData()
    } catch (err) {
      setErrorMsg("Failed to reset budget.")
    } finally {
      setSaving(false)
    }
  }

  const handleGoalOverride = async (action) => {
    if (!budget?.id) return
    try {
      await api.post(`/budgets/${budget.id}/goal-override?userId=${user.id}&action=${action}`)
      await loadData()
    } catch (err) {
      setErrorMsg("Failed to update goal preference.")
    }
  }


  const fetchInsights = async () => {
    if (!user?.id) return
    setInsightsLoading(true)
    setInsightsError("")
    try {
      const res = await api.get(`/budgets/insights?userId=${user.id}`)
      const raw = res.data.insights
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
      setInsights(JSON.parse(cleaned))
    } catch (err) {
      setInsightsError("Could not generate insights. Try again later.")
    } finally {
      setInsightsLoading(false)
    }
  }

  const hasBudget = budget !== null
  const pacing = budgetStatus?.pacing
  const buffer = budgetStatus?.buffer

  const getCatStatus = (cat) => {
    return budgetStatus?.categories?.[cat] || null
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "exceeded": return "Exceeded"
      case "warning": return "Warning"
      case "buffer-absorbing": return "Buffer"
      case "on-track": return "On Track"
      default: return ""
    }
  }

  const renderCategoryItem = (category) => {
    const limit = categoryLimits[category] || 0
    const spent = spentByCategory[category] || 0
    const percent = limit > 0 ? (spent / limit) * 100 : 0
    const cs = getCatStatus(category)
    const warnAt = (personaProfile?.warningThreshold ?? 0.80) * 100
    const status = cs?.status || (limit <= 0 ? "none" : percent >= 100 ? "exceeded" : percent >= warnAt ? "warning" : "on-track")

    return (
      <div key={category} className={`category-limit-item ${status}`}>
        <div className="category-info">
          <span className="category-dot" style={{ background: categoryColors[category] || "#6b7280" }} />
          <span className="category-name">{category}</span>
        </div>

        {editMode ? (
          <div className="limit-input">
            <span>£</span>
            <input
              type="number"
              step="0.01"
              value={limit || ""}
              onChange={(e) => handleLimitChange(category, e.target.value)}
              placeholder="0.00"
            />
          </div>
        ) : (
          <>
            <div className="limit-progress">
              <div className="limit-bar">
                <div
                  className={`limit-fill ${status}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
                {cs?.projectedExceeds && status !== "exceeded" && (
                  <div
                    className="projected-marker"
                    style={{ left: `${Math.min((cs.projectedTotal / limit) * 100, 100)}%` }}
                    title={`Projected: £${fmt(cs.projectedTotal)}`}
                  />
                )}
              </div>
            </div>
            <div className="limit-values">
              <span className={status !== "on-track" && status !== "buffer-absorbing" ? status : ""}>
                £{fmt(spent)}
              </span>
              <span className="limit-of">/ £{fmt(limit)}</span>
            </div>
            <div className="category-status-area">
              {limit > 0 && (
                <span className={`category-status-badge ${status}`}>
                  {getStatusLabel(status)}
                </span>
              )}
              {cs?.message && status !== "on-track" && (
                <div className="status-detail">{cs.message}</div>
              )}
              {cs?.nextAction && (status === "exceeded" || status === "buffer-absorbing") && (
                <div className="next-action">{cs.nextAction}</div>
              )}
              {cs?.projectedExceeds && status !== "exceeded" && status !== "buffer-absorbing" && (
                <div className="projected-warning">{cs.projectedMessage}</div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  const traceByLayer = useMemo(() => {
    const grouped = {}
    explanationTrace.forEach(step => {
      const layer = step.layer
      if (!grouped[layer]) grouped[layer] = []
      grouped[layer].push(step)
    })
    if (budgetStatus?.reallocation?.steps) {
      budgetStatus.reallocation.steps.forEach(step => {
        const layer = step.layer
        if (!grouped[layer]) grouped[layer] = []
        grouped[layer].push(step)
      })
    }
    return grouped
  }, [explanationTrace, budgetStatus])

  const spentPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  return (
    <div className="budget-page">
      <Navbar />
      <main className="budget-main">
        <div className="budget-header">
          <h1>Budget</h1>
          <p>{formatMonth(currentMonth)}</p>
        </div>

        {loading ? (
          <div className="loading-msg">Loading budget...</div>
        ) : (
          <>
            {hasBudget && (
              <>
                {/* ── 1. HERO SUMMARY ── */}
                <div className={`hero-card ${overallStatus}`}>
                  <div className="hero-top">
                    <div className="hero-remaining">
                      <span className="hero-label">Remaining this month</span>
                      <span className={`hero-value ${remainingBudget >= 0 ? "positive" : "negative"}`}>
                        £{fmt(remainingBudget)}
                      </span>
                      <span className="hero-sub">
                        of £{fmt(totalBudget)} budget
                        {suggestion?.monthlyGoalAllocations > 0 && (() => {
                          const cap = suggestion.totalCapacity || suggestion.totalBudget || 0
                          return cap > totalBudget ? (
                            <span className="hero-goal-deduction">
                              {" "}(£{fmt(cap)} - £{fmt(suggestion.monthlyGoalAllocations)} goals)
                            </span>
                          ) : null
                        })()}
                      </span>
                    </div>
                    <div className="hero-side">
                      <span className={`status-badge ${overallStatus}`}>
                        {overallStatus === "exceeded" ? "Exceeded" : overallStatus === "warning" ? "Warning" : "On Track"}
                      </span>
                      <div className="hero-metrics">
                        <div className="hero-metric">
                          <span className="hero-metric-value">£{fmt(totalSpent)}</span>
                          <span className="hero-metric-label">spent ({monthExpenses.length})</span>
                        </div>
                        {pacing && (
                          <div className="hero-metric">
                            <span className="hero-metric-value">£{fmt(pacing.safeToSpendPerDay ?? 0)}</span>
                            <span className="hero-metric-label">safe/day</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hero-progress">
                    <div
                      className={`hero-progress-fill ${overallStatus}`}
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>

                  <div className="hero-bottom">
                    {pacing && (
                      <span className={`hero-pacing ${pacing.pacingStatus?.toLowerCase() || ""}`}>
                        {pacing.pacingStatus === "AHEAD" ? "Ahead of pace" : pacing.pacingStatus === "BEHIND" ? "Behind pace" : "On pace"}
                        {budgetStatus?.daysRemaining > 0 && ` — ${budgetStatus.daysRemaining} days left`}
                      </span>
                    )}
                    {pacing?.pacingStatus === "AHEAD" && pacing.bonusAvailable > 0 && (
                      <span className="hero-bonus">+£{fmt(pacing.bonusAvailable)} bonus</span>
                    )}
                    {buffer && buffer.original > 0 && (
                      <span className={`hero-buffer ${buffer.depleted ? "depleted" : ""}`}>
                        Buffer: £{fmt(buffer.remaining)} / £{fmt(buffer.original)}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── 2. ACTIVE PLANS ── */}
                {allPlans.length > 0 ? (
                  <div className="plans-strip">
                    <div className="plans-strip-header">
                      <button className="collapse-toggle" onClick={() => setShowPlans(!showPlans)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showPlans ? "rotated" : ""}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <h2>Active Plans</h2>
                      </button>
                      <a href="/plans" className="plans-link">Manage Plans</a>
                    </div>

                    {showPlans && <>
                    {/* Outcome plans (goals) */}
                    {outcomePlans.length > 0 && (
                      <div className="plans-group">
                        <span className="plans-group-label">
                          <span className="plans-group-dot goal" />
                          Goals
                        </span>
                        <div className="plans-list">
                          {outcomePlans.map(plan => {
                            const progress = plan.targetAmount > 0
                              ? Math.min((plan.currentAmount || 0) / plan.targetAmount * 100, 100)
                              : 0
                            return (
                              <div key={plan.id} className="plan-row goal">
                                <span className="plan-row-title">{plan.title}</span>
                                <div className="plan-row-chips">
                                  {plan.targetAmount > 0 && (
                                    <span className="plan-chip goal">£{fmt(plan.currentAmount || 0, 0)} / £{fmt(plan.targetAmount, 0)}</span>
                                  )}
                                  {plan.monthlyContribution > 0 && (
                                    <span className="plan-chip contribution">£{fmt(plan.monthlyContribution, 0)}/mo</span>
                                  )}
                                </div>
                                {plan.targetAmount > 0 && (
                                  <div className="plan-row-progress">
                                    <div className="plan-row-progress-fill" style={{ width: `${progress}%` }} />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Priority plans */}
                    {priorityPlans.length > 0 && (
                      <div className="plans-group">
                        <span className="plans-group-label">
                          <span className="plans-group-dot priority" />
                          Priorities
                        </span>
                        <div className="plans-list">
                          {priorityPlans.map(plan => {
                            let cats = []
                            if (plan.priorityCategories) {
                              try { cats = JSON.parse(plan.priorityCategories) } catch {}
                            }
                            const hasNewFields = plan.direction != null
                            let legacyAdj = []
                            if (!hasNewFields && plan.priorityAdjustments) {
                              try { legacyAdj = JSON.parse(plan.priorityAdjustments) } catch {}
                            }

                            // Compute net £ impact for this plan's categories
                            const ctxImpact = suggestion?.contextImpact || {}
                            const planNetImpact = cats.reduce((sum, cat) => sum + (ctxImpact[cat] || 0), 0)

                            return (
                              <div key={plan.id} className="plan-row priority">
                                <span className="plan-row-title">{plan.title}</span>
                                <div className="plan-row-chips">
                                  {hasNewFields ? (
                                    <>
                                      {cats.map((cat, i) => (
                                        <span key={i} className={`adjustment-chip ${directionClass[plan.direction] || "neutral"}`}>
                                          {cat} {directionIcons[plan.direction] || ""} {plan.intensity || "MEDIUM"}
                                        </span>
                                      ))}
                                      {plan.priorityAmount > 0 && (
                                        <span className="adjustment-chip amount">£{fmt(plan.priorityAmount)}</span>
                                      )}
                                      {Math.abs(planNetImpact) >= 0.01 && (
                                        <span className={`context-impact-chip ${planNetImpact > 0 ? "positive" : "negative"}`}>
                                          {planNetImpact > 0 ? "+" : ""}£{fmt(planNetImpact)}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    legacyAdj.map((adj, i) => (
                                      <span key={i} className={`adjustment-chip ${adj.direction === "increase" ? "positive" : "negative"}`}>
                                        {adj.category} {adj.direction === "increase" ? "\u2191" : "\u2193"} {adj.intensity}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    </>}
                  </div>
                ) : (
                  <div className="plans-strip empty">
                    <div className="plans-strip-header">
                      <button className="collapse-toggle" onClick={() => setShowPlans(!showPlans)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showPlans ? "rotated" : ""}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <h2>Active Plans</h2>
                      </button>
                      <a href="/plans" className="plans-link">Manage Plans</a>
                    </div>
                    {showPlans && <p className="plans-empty">No active plans — budget uses pure spending history.</p>}
                  </div>
                )}

                {errorMsg && <div className="error-msg">{errorMsg}</div>}

                {/* ── 3. NUDGE (what should I do next?) ── */}
                {budgetStatus?.nudges?.nudges?.length > 0 && (
                  <div className={`nudge-card severity-${budgetStatus.nudges.nudges[0].severity}`}>
                    <div className="nudge-card-header">
                      <h4>{budgetStatus.nudges.nudges[0].title}</h4>
                      <span className={`nudge-type-badge ${budgetStatus.nudges.nudges[0].nudgeType}`}>
                        {budgetStatus.nudges.nudges[0].nudgeType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="nudge-message">{budgetStatus.nudges.nudges[0].message}</p>
                    <div className="nudge-meta">
                      <span className="nudge-explanation">{budgetStatus.nudges.nudges[0].explanationReason}</span>
                      {budgetStatus.nudges.nudges[0].actionType && (
                        <span className="nudge-action-chip">
                          {budgetStatus.nudges.nudges[0].actionType.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 3. GOAL PROTECTION PROMPT ── */}
                {budgetStatus && totalSpent > totalBudget &&
                 budgetStatus.monthlyGoalAllocations > 0 &&
                 budgetStatus.goalOverrideAction === "KEEP" && !budget?.goalOverrideAction && (
                  <div className="goal-protection-prompt">
                    <div className="prompt-header">
                      <h3>You've exceeded your budget</h3>
                      <p>How would you like to handle your plan contributions?</p>
                    </div>
                    <div className="prompt-options">
                      <button className="prompt-option recommended" onClick={() => handleGoalOverride("KEEP")}>
                        <div className="option-title">Keep plan contributions unchanged</div>
                        <div className="option-subtitle">Recommended — stay on track with your plans</div>
                      </button>
                      <button className="prompt-option" onClick={() => handleGoalOverride("REDUCE")}>
                        <div className="option-title">Reduce plan contributions this month</div>
                        <div className="option-subtitle">
                          Frees up £{fmt(budgetStatus.monthlyGoalAllocations || 0)}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── 4. CATEGORY BUDGETS (main body) ── */}
                <div className="budget-section">
                  <div className="section-header">
                    <button className="collapse-toggle" onClick={() => setShowCategories(!showCategories)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showCategories ? "rotated" : ""}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <h2>Category Budgets</h2>
                    </button>
                    {showCategories && (
                      <div className="section-actions">
                        {suggestion?.categoryExplanations && !editMode && (
                          <button
                            className="explain-toggle"
                            onClick={() => setShowExplanations(!showExplanations)}
                          >
                            {showExplanations ? "Hide reasons" : "Why these amounts?"}
                          </button>
                        )}
                        {!editMode ? (
                          <button className="edit-btn" onClick={() => setEditMode(true)}>Edit Budget</button>
                        ) : (
                          <div className="edit-actions">
                            <button className="cancel-btn" onClick={() => { setEditMode(false); loadData() }}>Cancel</button>
                            {suggestion && (
                              <button className="reset-btn" onClick={handleResetToSuggestion} disabled={saving}>Reset</button>
                            )}
                            <button className="save-btn" onClick={handleSave} disabled={saving}>
                              {saving ? "Saving..." : "Save"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {showCategories && <>
                  {/* Reallocation alert (folded in from standalone card) */}
                  {budgetStatus?.reallocation?.active && !editMode && (
                    <div className="reallocation-alert">
                      <div className="reallocation-alert-header">
                        <span className={`reallocation-badge ${budgetStatus.reallocation.fullyResolved ? "amber" : "red"}`}>
                          {budgetStatus.reallocation.fullyResolved ? "Rebalance Available" : "Pressure Detected"}
                        </span>
                        <span className="reallocation-summary-text">{budgetStatus.reallocation.summary}</span>
                      </div>
                      <div className="pressure-bar-track">
                        <div
                          className={`pressure-bar-fill ${budgetStatus.reallocation.fullyResolved ? "full" : "partial"}`}
                          style={{ width: `${Math.min((budgetStatus.reallocation.totalFreed / budgetStatus.reallocation.pressure) * 100, 100)}%` }}
                        />
                      </div>
                      {budgetStatus.reallocation.suggestions?.length > 0 && (
                        <div className="reallocation-suggestions">
                          {budgetStatus.reallocation.suggestions.map((s, i) => (
                            <div key={i} className="reallocation-suggestion-item">
                              <span className="category-dot" style={{ background: categoryColors[s.category] || "#6b7280" }} />
                              <span className="realloc-cat">{s.category}</span>
                              <span className="reallocation-reduction-chip">
                                -£{fmt(s.reduction)}
                              </span>
                              <span className="reallocation-limits">
                                £{fmt(s.currentLimit)} &rarr; £{fmt(s.suggestedLimit)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanations Panel */}
                  {showExplanations && suggestion?.categoryExplanations && (
                    <div className="explanations-panel">
                      {Object.entries(suggestion.categoryExplanations).map(([cat, info]) => (
                        <div key={cat} className="explanation-item">
                          <span className="category-dot" style={{ background: categoryColors[cat] || "#6b7280" }} />
                          <div className="explanation-body">
                            <div className="explanation-values">
                              <span>£{fmt(info.suggested ?? 0)} suggested</span>
                            </div>
                            <div className="explanation-reason">{info.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {editMode && (
                    <div className="total-budget-edit">
                      <label>Total Monthly Budget (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalBudget}
                        onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {/* Essential tier */}
                  {(billsTotal > 0 || subsTotal > 0) && !editMode && (
                    <div className="tier-section">
                      <div className="tier-header">
                        <span className="tier-dot essential" />
                        <span>Fixed & Essential</span>
                        <span className="tier-amount">
                          £{fmt(billsTotal + subsTotal)}/mo
                        </span>
                      </div>
                      <div className="essential-items">
                        {billsTotal > 0 && (
                          <div className="essential-item">
                            <div className="essential-info">
                              <span className="category-dot" style={{ background: "#3b82f6" }} />
                              <span className="category-name">Bills & Utilities</span>
                            </div>
                            <span className="essential-value">£{fmt(billsTotal)}</span>
                          </div>
                        )}
                        {subsTotal > 0 && (
                          <div className="essential-item">
                            <div className="essential-info">
                              <span className="category-dot" style={{ background: "#6366f1" }} />
                              <span className="category-name">Subscriptions</span>
                            </div>
                            <span className="essential-value">£{fmt(subsTotal)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Flexible + Discretionary tiers */}
                  {TIER_ORDER.map(tier => {
                    const cats = editMode
                      ? Object.keys(categoryLimits).filter(c => getCategoryTier(c) === tier)
                      : (categoriesByTier[tier] || [])
                    if (cats.length === 0) return null
                    return (
                      <div key={tier} className="tier-section">
                        {!editMode && (
                          <div className="tier-header">
                            <span className="tier-dot" style={{ background: TIER_COLORS[tier] }} />
                            <span>{TIER_LABELS[tier]}</span>
                          </div>
                        )}
                        <div className="category-limits">
                          {cats.map(category => renderCategoryItem(category))}
                        </div>
                      </div>
                    )
                  })}

                  {editMode && Object.keys(categoryLimits).length === 0 && (
                    <div className="category-limits">
                      {["Food", "Travel", "Education", "Leisure", "Other"].map(cat => renderCategoryItem(cat))}
                    </div>
                  )}

                  {/* Active plans affecting this budget */}
                  {(allPlans.length > 0 || suggestion?.monthlyGoalAllocations > 0) && !editMode && (
                    <div className="tier-section">
                      <div className="tier-header">
                        <span className="tier-dot plans" />
                        <span>Active Plans</span>
                        {suggestion?.monthlyGoalAllocations > 0 && (
                          <span className="tier-amount">£{fmt(suggestion.monthlyGoalAllocations)}/mo deducted</span>
                        )}
                      </div>
                      <div className="plans-tier-list">
                        {/* Outcome plans (goals) */}
                        {suggestion?.goalBreakdown?.length > 0 && suggestion.goalBreakdown.map((goal, i) => (
                          <div key={`goal-${i}`} className="plans-tier-item goal">
                            <span className="plans-tier-dot goal" />
                            <span className="plans-tier-title">{goal.title}</span>
                            <div className="plans-tier-chips">
                              <span className="plan-chip contribution">£{fmt(goal.monthlyContribution, 0)}/mo</span>
                              {goal.isFlexible === false && <span className="goal-lock-badge">Protected</span>}
                            </div>
                          </div>
                        ))}

                        {/* Priority plans */}
                        {priorityPlans.map(plan => {
                          let cats = []
                          if (plan.priorityCategories) {
                            try { cats = JSON.parse(plan.priorityCategories) } catch {}
                          }
                          const hasNewFields = plan.direction != null
                          let legacyAdj = []
                          if (!hasNewFields && plan.priorityAdjustments) {
                            try { legacyAdj = JSON.parse(plan.priorityAdjustments) } catch {}
                          }

                          const ctxImpact = suggestion?.contextImpact || {}

                          return (
                            <div key={plan.id} className="plans-tier-item priority">
                              <span className="plans-tier-dot priority" />
                              <span className="plans-tier-title">{plan.title}</span>
                              <div className="plans-tier-chips">
                                {hasNewFields ? (
                                  <>
                                    {cats.map((cat, i) => {
                                      const impact = ctxImpact[cat] || 0
                                      return (
                                        <span key={i} className={`adjustment-chip small ${directionClass[plan.direction] || "neutral"}`}>
                                          {cat} {directionIcons[plan.direction] || ""}
                                          {Math.abs(impact) >= 0.01 && (
                                            <span className="context-impact-inline">
                                              {" "}{impact > 0 ? "+" : ""}£{fmt(impact)}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    })}
                                    {plan.priorityAmount > 0 && (
                                      <span className="adjustment-chip small amount">£{fmt(plan.priorityAmount, 0)}</span>
                                    )}
                                  </>
                                ) : (
                                  legacyAdj.map((adj, i) => (
                                    <span key={i} className={`adjustment-chip small ${adj.direction === "increase" ? "positive" : "negative"}`}>
                                      {adj.category} {adj.direction === "increase" ? "\u2191" : "\u2193"}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unused categories */}
                  {unusedCategories.length > 0 && !editMode && (
                    <div className="unused-section">
                      <button className="unused-toggle" onClick={() => setShowUnused(!showUnused)}>
                        <span>Unused this month ({unusedCategories.length})</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showUnused ? "rotated" : ""}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {showUnused && (
                        <div className="unused-categories">
                          {unusedCategories.map(cat => (
                            <div key={cat} className="category-limit-item unused">
                              <div className="category-info">
                                <span className="category-dot" style={{ background: categoryColors[cat] || "#6b7280" }} />
                                <span className="category-name">{cat}</span>
                              </div>
                              <div className="limit-values">
                                <span>£0.00</span>
                                <span className="limit-of">/ £{fmt(categoryLimits[cat] || 0)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  </>}
                </div>

                {/* ── 5. HOW THIS BUDGET WAS BUILT ── */}
                {explanationTrace.length > 0 && (
                  <div className="waterfall-section">
                    <div className="waterfall-title-row">
                      <button className="collapse-toggle" onClick={() => setShowWaterfall(!showWaterfall)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showWaterfall ? "rotated" : ""}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <h2>How This Budget Was Built</h2>
                      </button>
                      <div className="waterfall-chips">
                        {engineMode === "ADAPTIVE" && (
                          <span className="engine-chip">Adaptive Engine</span>
                        )}
                        {personaProfile && personaProfile.personaType !== "NEUTRAL" && (
                          <span className="persona-chip"
                            style={{
                              background: (PERSONA_MODE_COLORS[personaProfile.personaType] || PERSONA_MODE_COLORS.NEUTRAL).bg,
                              borderColor: (PERSONA_MODE_COLORS[personaProfile.personaType] || PERSONA_MODE_COLORS.NEUTRAL).border,
                              color: (PERSONA_MODE_COLORS[personaProfile.personaType] || PERSONA_MODE_COLORS.NEUTRAL).text
                            }}>
                            {personaProfile.personaType.replace(/_/g, " ")}
                            {" — "}
                            {GUIDANCE_STYLE_LABELS[personaProfile.guidanceStyle] || "Standard"}
                          </span>
                        )}
                      </div>
                    </div>

                    {showWaterfall && <>
                    {personaProfile && personaProfile.personaType !== "NEUTRAL" && personaProfile.guidanceMessage && (
                      <p className="waterfall-persona-msg">{personaProfile.guidanceMessage}</p>
                    )}

                    <div className="waterfall-layers">
                      {["CAPACITY", "GOALS", "CONTEXT", "ALLOCATION", "PERSONA", "REALLOCATION"].map(layer => {
                        const layerSteps = traceByLayer[layer]
                        if (!layerSteps || layerSteps.length === 0) return null
                        return (
                          <div key={layer} className="waterfall-layer">
                            <div className="waterfall-layer-header" style={{ borderLeftColor: LAYER_COLORS[layer] }}>
                              <span className="waterfall-layer-dot" style={{ background: LAYER_COLORS[layer] }} />
                              <span className="waterfall-layer-name">{LAYER_LABELS[layer]}</span>
                            </div>
                            <div className="waterfall-steps">
                              {layerSteps.map((step, i) => (
                                <div key={i} className="waterfall-step">
                                  <div className="waterfall-step-reason">{step.reason}</div>
                                  <div className="waterfall-step-values">
                                    {step.adjustment !== 0 && (
                                      <span className={`waterfall-adj ${step.adjustment > 0 ? "positive" : "negative"}`}>
                                        {step.adjustment > 0 ? "+" : ""}£{fmt(step.adjustment)}
                                      </span>
                                    )}
                                    <span className="waterfall-result">£{fmt(step.result)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    </>}
                  </div>
                )}

                {/* ── 7. AI INSIGHTS ── */}
                <div className="insights-section">
                  <div className="section-header">
                    <button className="collapse-toggle" onClick={() => setShowInsights(!showInsights)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showInsights ? "rotated" : ""}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <h2>AI Budget Insights</h2>
                    </button>
                    {showInsights && (
                      <>
                        {!insights && !insightsLoading && (
                          <button className="insights-btn" onClick={fetchInsights}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>
                            Get Insights
                          </button>
                        )}
                        {insights && (
                          <button className="insights-btn refresh" onClick={fetchInsights} disabled={insightsLoading}>
                            Refresh
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {showInsights && <>
                  {insightsLoading && (
                    <div className="insights-loading">
                      {[1, 2, 3].map(i => <div key={i} className="insight-skeleton" />)}
                    </div>
                  )}

                  {insightsError && <div className="insights-error">{insightsError}</div>}

                  {insights && !insightsLoading && (
                    <div className="insights-grid">
                      {insights.map((insight, i) => (
                        <div key={i} className="insight-card" style={{ animationDelay: `${i * 0.1}s` }}>
                          <div className="insight-content">
                            <h4>{insight.title}</h4>
                            <p>{insight.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!insights && !insightsLoading && !insightsError && (
                    <div className="insights-empty">
                      <p>Get personalized spending tips powered by AI</p>
                    </div>
                  )}
                  </>}
                </div>

              </>
            )}

            {/* No budget yet */}
            {!hasBudget && (
              <div className="empty-state">
                <div className="empty-illustration">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <rect x="8" y="14" width="48" height="36" rx="4" stroke="#d1d5db" strokeWidth="2"/>
                    <line x1="8" y1="24" x2="56" y2="24" stroke="#d1d5db" strokeWidth="2"/>
                    <rect x="14" y="30" width="12" height="14" rx="2" fill="#e5e7eb"/>
                    <rect x="30" y="34" width="12" height="10" rx="2" fill="#d1d5db"/>
                    <rect x="46" y="38" width="4" height="6" rx="1" fill="#e5e7eb"/>
                  </svg>
                </div>
                <h3>No budget set for this month</h3>
                <p>Add some income and expenses to get a personalized budget suggestion.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
