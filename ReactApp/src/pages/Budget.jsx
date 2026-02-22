import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import "./css/Budget.css"

const API_BASE = "http://localhost:8080/api/budgets"
const EXPENSE_API = "http://localhost:8080/api/expenses"
const BILLS_API = "http://localhost:8080/api/bills"
const SUBS_API = "http://localhost:8080/api/subscriptions"

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

  // Live totals from Bills & Subscriptions pages
  const [billsTotal, setBillsTotal] = useState(0)
  const [subsTotal, setSubsTotal] = useState(0)

  // UI toggles
  const [showExplanations, setShowExplanations] = useState(false)
  const [showUnused, setShowUnused] = useState(false)

  // Smart Budget mode
  const [smartMode, setSmartMode] = useState(false)
  const [expenseCount, setExpenseCount] = useState(0)
  const [smartThreshold, setSmartThreshold] = useState(20)

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
        axios.get(`${API_BASE}/current?userId=${user.id}`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/suggest?userId=${user.id}`),
        axios.get(`${EXPENSE_API}?userId=${user.id}`),
        axios.get(`${BILLS_API}/summary?userId=${user.id}`).catch(() => ({ data: null })),
        axios.get(`${SUBS_API}?userId=${user.id}`).catch(() => ({ data: [] }))
      ])

      setSuggestion(suggestRes.data)
      setSmartMode(suggestRes.data.smartMode || false)
      setExpenseCount(suggestRes.data.expenseCount || 0)
      setSmartThreshold(suggestRes.data.smartThreshold || 20)
      setExpenses(Array.isArray(expenseRes.data) ? expenseRes.data : [])

      // Live bills total from Bills page
      setBillsTotal(billsSummaryRes.data?.totalMonthlyBills || 0)

      // Live subscriptions total (same calc as backend)
      const activeSubs = Array.isArray(subsRes.data) ? subsRes.data.filter(s => s.status === "ACTIVE") : []
      const monthlySubsTotal = activeSubs.reduce((sum, sub) => {
        if (sub.billingCycle === "MONTHLY") return sum + sub.cost
        if (sub.billingCycle === "YEARLY") return sum + sub.cost / 12
        if (sub.billingCycle === "WEEKLY") return sum + sub.cost * 4.33
        return sum
      }, 0)
      setSubsTotal(Math.round(monthlySubsTotal * 100) / 100)

      if (budgetRes.data) {
        const currentBudget = budgetRes.data
        const suggestedTotal = suggestRes.data?.totalBudget || 0

        // Auto-sync: if income/bills/subs/goals changed, update the stored budget to match
        if (autoApply && suggestedTotal > 0 && Math.abs(currentBudget.totalBudget - suggestedTotal) > 0.01) {
          const suggestedLimits = suggestRes.data.categoryLimits || {}
          const bufAmt = suggestRes.data.bufferAmount || Math.round(suggestedTotal * 0.05 * 100) / 100
          const limitsTotal = Object.values(suggestedLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
          const safeToSpend = Math.max(0, suggestedTotal - limitsTotal - bufAmt)

          const payload = {
            month: currentMonth,
            totalBudget: suggestedTotal,
            categoryLimits: JSON.stringify(suggestedLimits),
            safeToSpend,
            bufferAmount: bufAmt,
            bufferRemaining: bufAmt,
            categoryMeta: JSON.stringify(suggestRes.data.categoryExplanations || {})
          }

          try {
            await axios.put(`${API_BASE}/${currentBudget.id}?userId=${user.id}`, payload)
            setBudget({ ...currentBudget, totalBudget: suggestedTotal })
            setCategoryLimits(suggestedLimits)
            setTotalBudget(suggestedTotal)
          } catch {
            // Fallback to stored values if sync fails
            setBudget(currentBudget)
            setCategoryLimits(JSON.parse(currentBudget.categoryLimits || "{}"))
            setTotalBudget(currentBudget.totalBudget)
          }
        } else {
          setBudget(currentBudget)
          setCategoryLimits(JSON.parse(currentBudget.categoryLimits || "{}"))
          setTotalBudget(currentBudget.totalBudget)
        }

        // Load status
        try {
          const statusRes = await axios.get(`${API_BASE}/status?userId=${user.id}`)
          setBudgetStatus(statusRes.data)
        } catch { setBudgetStatus(null) }
      } else if (autoApply && suggestRes.data && suggestRes.data.totalBudget > 0) {
        const suggestedLimits = suggestRes.data.categoryLimits || {}
        const suggestedTotal = suggestRes.data.totalBudget || 0
        const bufferAmount = suggestRes.data.bufferAmount || Math.round(suggestedTotal * 0.05 * 100) / 100
        const limitsTotal = Object.values(suggestedLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
        const safeToSpend = Math.max(0, suggestedTotal - limitsTotal - bufferAmount)

        const payload = {
          month: currentMonth,
          totalBudget: suggestedTotal,
          categoryLimits: JSON.stringify(suggestedLimits),
          safeToSpend,
          bufferAmount,
          bufferRemaining: bufferAmount,
          categoryMeta: JSON.stringify(suggestRes.data.categoryExplanations || {})
        }

        const created = await axios.post(`${API_BASE}?userId=${user.id}`, payload)
        setBudget(created.data)
        setCategoryLimits(suggestedLimits)
        setTotalBudget(suggestedTotal)
        // Load status for newly created budget
        try {
          const statusRes = await axios.get(`${API_BASE}/status?userId=${user.id}`)
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

  useEffect(() => {
    if (user?.id) loadData(true)
  }, [user?.id])

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
    if (percent >= 80) return "warning"
    return "on-track"
  }, [totalSpent, totalBudget])

  // Get category tier from status or fallback
  const getCategoryTier = (cat) => {
    if (budgetStatus?.categories?.[cat]?.tier) return budgetStatus.categories[cat].tier
    return suggestion?.categoryTiers?.[cat] || DEFAULT_TIERS[cat] || "FLEXIBLE"
  }

  // Active categories grouped by tier
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
        await axios.put(`${API_BASE}/${budget.id}?userId=${user.id}`, payload)
      } else {
        await axios.post(`${API_BASE}?userId=${user.id}`, payload)
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
      await axios.put(`${API_BASE}/${budget.id}?userId=${user.id}`, payload)
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
      await axios.post(`${API_BASE}/${budget.id}/goal-override?userId=${user.id}&action=${action}`)
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
      const res = await axios.get(`${API_BASE}/insights?userId=${user.id}`)
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

  // Helper to get status display for a category
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

  // Render a single category row
  const renderCategoryItem = (category) => {
    const limit = categoryLimits[category] || 0
    const spent = spentByCategory[category] || 0
    const percent = limit > 0 ? (spent / limit) * 100 : 0
    const cs = getCatStatus(category)
    const status = cs?.status || (limit <= 0 ? "none" : percent >= 100 ? "exceeded" : percent >= 80 ? "warning" : "on-track")

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
                    title={`Projected: £${cs.projectedTotal?.toFixed(2)}`}
                  />
                )}
              </div>
            </div>
            <div className="limit-values">
              <span className={status !== "on-track" && status !== "buffer-absorbing" ? status : ""}>
                £{spent.toFixed(2)}
              </span>
              <span className="limit-of">/ £{limit.toFixed(2)}</span>
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
                {/* Smart Budget Banner */}
                {smartMode && (
                  <div className="smart-budget-banner">
                    <div className="smart-badge-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
                        <line x1="10" y1="22" x2="14" y2="22"/>
                      </svg>
                    </div>
                    <div className="smart-badge-text">
                      <span className="smart-badge-title">Smart Budget Activated</span>
                      <span className="smart-badge-sub">AI-personalized based on {expenseCount} expenses</span>
                    </div>
                  </div>
                )}

                {/* Basic Mode Progress */}
                {!smartMode && (
                  <div className="basic-budget-info">
                    <div className="basic-budget-label">Budget Mode: Basic (Even Split)</div>
                    <div className="smart-progress-bar">
                      <div
                        className="smart-progress-fill"
                        style={{ width: `${Math.min((expenseCount / smartThreshold) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="smart-progress-text">
                      {expenseCount}/{smartThreshold} expenses — add {Math.max(0, smartThreshold - expenseCount)} more to unlock Smart Budget
                    </div>
                  </div>
                )}

                {/* Live Stats */}
                <div className="live-stats">
                  <div className={`live-stat-card main-stat ${overallStatus}`}>
                    <div className="stat-header">
                      <span className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 14h.01"/><path d="M10 14h4"/></svg>
                      </span>
                      <span className={`status-badge ${overallStatus}`}>
                        {overallStatus === "exceeded" ? "Exceeded" : overallStatus === "warning" ? "Warning" : "On Track"}
                      </span>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Remaining This Month</div>
                      <div className={`stat-value ${remainingBudget >= 0 ? "positive" : "negative"}`}>
                        £{remainingBudget.toFixed(2)}
                      </div>
                      <div className="stat-sub">of £{totalBudget.toFixed(2)} budget</div>
                    </div>
                    <div className="stat-progress">
                      <div
                        className={`stat-progress-fill ${overallStatus}`}
                        style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Pacing Card */}
                  <div className={`live-stat-card pacing-card ${pacing?.pacingStatus?.toLowerCase() || ""}`}>
                    <div className="stat-header">
                      <span className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </span>
                      {pacing?.pacingStatus && (
                        <span className={`pacing-badge ${pacing.pacingStatus.toLowerCase()}`}>
                          {pacing.pacingStatus === "AHEAD" ? "Ahead" : pacing.pacingStatus === "BEHIND" ? "Behind" : "On Pace"}
                        </span>
                      )}
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Safe to Spend Daily</div>
                      <div className="stat-value">
                        £{(pacing?.safeToSpendPerDay ?? 0).toFixed(2)}
                      </div>
                      <div className="stat-sub">{pacing?.pacingMessage || `${budgetStatus?.daysRemaining || 0} days left`}</div>
                      {pacing?.pacingStatus === "AHEAD" && pacing.bonusAvailable > 0 && (
                        <div className="bonus-chip">+£{pacing.bonusAvailable.toFixed(2)} bonus available</div>
                      )}
                    </div>
                  </div>

                  {/* Spent Card */}
                  <div className="live-stat-card">
                    <div className="stat-header">
                      <span className="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      </span>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Spent So Far</div>
                      <div className="stat-value expense">£{totalSpent.toFixed(2)}</div>
                      <div className="stat-sub">{monthExpenses.length} transactions</div>
                    </div>
                  </div>
                </div>

                {/* Buffer Card */}
                {buffer && buffer.original > 0 && (
                  <div className={`buffer-card ${buffer.depleted ? "depleted" : ""}`}>
                    <div className="buffer-header">
                      <span>Buffer</span>
                      <span className={buffer.depleted ? "buffer-depleted-text" : ""}>
                        £{buffer.remaining.toFixed(2)} of £{buffer.original.toFixed(2)} remaining
                      </span>
                    </div>
                    <div className="buffer-bar">
                      <div
                        className="buffer-fill"
                        style={{ width: `${(buffer.remaining / buffer.original) * 100}%` }}
                      />
                    </div>
                    {buffer.overflows && Object.keys(buffer.overflows).length > 0 && (
                      <div className="buffer-overflows">
                        {Object.entries(buffer.overflows).map(([cat, amount]) => (
                          <span key={cat} className="overflow-chip">
                            {cat}: £{amount.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {errorMsg && <div className="error-msg">{errorMsg}</div>}

                {/* Goal Protection Prompt */}
                {budgetStatus && totalSpent > totalBudget &&
                 budgetStatus.monthlyGoalAllocations > 0 &&
                 budgetStatus.goalOverrideAction === "KEEP" && !budget?.goalOverrideAction && (
                  <div className="goal-protection-prompt">
                    <div className="prompt-header">
                      <h3>You've exceeded your budget</h3>
                      <p>How would you like to handle your goal contributions?</p>
                    </div>
                    <div className="prompt-options">
                      <button className="prompt-option recommended" onClick={() => handleGoalOverride("KEEP")}>
                        <div className="option-title">Keep goal contributions unchanged</div>
                        <div className="option-subtitle">Recommended — stay on track with your goals</div>
                      </button>
                      <button className="prompt-option" onClick={() => handleGoalOverride("REDUCE")}>
                        <div className="option-title">Reduce goal contributions this month</div>
                        <div className="option-subtitle">
                          Frees up £{(budgetStatus.monthlyGoalAllocations || 0).toFixed(2)}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Budgets — Grouped by Tier */}
                <div className="budget-section">
                  <div className="section-header">
                    <h2>Category Budgets</h2>
                    <div className="section-actions">
                      {suggestion?.categoryExplanations && !editMode && (
                        <button
                          className="explain-toggle"
                          onClick={() => setShowExplanations(!showExplanations)}
                        >
                          {showExplanations ? "Hide reasons" : (smartMode ? "How AI decided" : "Why these amounts?")}
                        </button>
                      )}
                      {!editMode ? (
                        <button className="edit-btn" onClick={() => setEditMode(true)}>Edit Budget</button>
                      ) : (
                        <div className="edit-actions">
                          <button className="cancel-btn" onClick={() => { setEditMode(false); loadData() }}>Cancel</button>
                          <button className="save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explanations Panel */}
                  {showExplanations && suggestion?.categoryExplanations && (
                    <div className="explanations-panel">
                      {Object.entries(suggestion.categoryExplanations).map(([cat, info]) => (
                        <div key={cat} className="explanation-item">
                          <span className="category-dot" style={{ background: categoryColors[cat] || "#6b7280" }} />
                          <div className="explanation-body">
                            <div className="explanation-values">
                              <span>£{info.pastAvg?.toFixed(2)} avg</span>
                              <span className="arrow">→</span>
                              <span>£{info.suggested?.toFixed(2)} suggested</span>
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

                  {/* Essential tier — live values from Bills & Subscriptions pages */}
                  {(billsTotal > 0 || subsTotal > 0) && !editMode && (
                    <div className="tier-section">
                      <div className="tier-header">
                        <span className="tier-dot essential" />
                        <span>Fixed & Essential</span>
                        <span className="tier-amount">
                          £{(billsTotal + subsTotal).toFixed(2)}/mo
                        </span>
                      </div>
                      <div className="essential-items">
                        {billsTotal > 0 && (
                          <div className="essential-item">
                            <div className="essential-info">
                              <span className="category-dot" style={{ background: "#3b82f6" }} />
                              <span className="category-name">Bills & Utilities</span>
                            </div>
                            <span className="essential-value">£{billsTotal.toFixed(2)}</span>
                          </div>
                        )}
                        {subsTotal > 0 && (
                          <div className="essential-item">
                            <div className="essential-info">
                              <span className="category-dot" style={{ background: "#6366f1" }} />
                              <span className="category-name">Subscriptions</span>
                            </div>
                            <span className="essential-value">£{subsTotal.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="tier-note">Auto-filled from your Bills & Subscriptions pages. Deducted before your spending budget.</div>
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

                  {/* Edit mode: show all categories without tier grouping */}
                  {editMode && Object.keys(categoryLimits).length === 0 && (
                    <div className="category-limits">
                      {["Food", "Travel", "Education", "Leisure", "Other"].map(cat => renderCategoryItem(cat))}
                    </div>
                  )}

                  {/* Goals tier info */}
                  {suggestion?.monthlyGoalAllocations > 0 && !editMode && (
                    <div className="tier-section">
                      <div className="tier-header">
                        <span className="tier-dot goals" />
                        <span>Goal Contributions</span>
                        <span className="tier-amount">£{suggestion.monthlyGoalAllocations.toFixed(2)}/mo</span>
                      </div>
                      {suggestion.goalBreakdown && suggestion.goalBreakdown.length > 0 && (
                        <div className="goal-breakdown">
                          {suggestion.goalBreakdown.map((goal, i) => (
                            <div key={i} className="goal-item">
                              <span>{goal.title}</span>
                              <span>£{goal.monthlyContribution.toFixed(2)}/mo</span>
                            </div>
                          ))}
                        </div>
                      )}
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
                                <span className="limit-of">/ £{(categoryLimits[cat] || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Insights */}
                <div className="insights-section">
                  <div className="section-header">
                    <h2>AI Budget Insights</h2>
                    {!insights && !insightsLoading && (
                      <button className="insights-btn" onClick={fetchInsights}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313-12.454z"/><path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/></svg>
                        Get Insights
                      </button>
                    )}
                    {insights && (
                      <button className="insights-btn refresh" onClick={fetchInsights} disabled={insightsLoading}>
                        Refresh
                      </button>
                    )}
                  </div>

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
                </div>

                {/* Quick Actions */}
                {suggestion && (
                  <div className="quick-actions">
                    <button className="reset-btn" onClick={handleResetToSuggestion} disabled={saving}>
                      Reset to Suggested Budget
                    </button>
                  </div>
                )}
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
