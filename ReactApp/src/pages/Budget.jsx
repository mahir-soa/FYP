import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import "./css/Budget.css"

const API_BASE = "http://localhost:8080/api/budgets"
const EXPENSE_API = "http://localhost:8080/api/expenses"

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

const categoryIcons = {
  Food: "🍔",
  Travel: "🚗",
  Education: "📚",
  Leisure: "🎮",
  Other: "📦"
}

const getCategoryStatus = (spent, limit) => {
  if (limit <= 0) return "none"
  const percent = (spent / limit) * 100
  if (percent >= 100) return "exceeded"
  if (percent >= 80) return "warning"
  return "on-track"
}

const getStatusLabel = (status) => {
  switch (status) {
    case "exceeded": return "Exceeded"
    case "warning": return "Warning"
    case "on-track": return "On Track"
    default: return ""
  }
}

export default function Budget() {
  const { user } = useAuth()
  const currentMonth = getCurrentMonth()

  const [budget, setBudget] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [categoryLimits, setCategoryLimits] = useState({})
  const [totalBudget, setTotalBudget] = useState(0)

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    setErrorMsg("")

    try {
      const [budgetRes, suggestRes, expenseRes] = await Promise.all([
        axios.get(`${API_BASE}/current?userId=${user.id}`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/suggest?userId=${user.id}`),
        axios.get(`${EXPENSE_API}?userId=${user.id}`)
      ])

      if (budgetRes.data) {
        setBudget(budgetRes.data)
        setCategoryLimits(JSON.parse(budgetRes.data.categoryLimits || "{}"))
        setTotalBudget(budgetRes.data.totalBudget)
      } else {
        setBudget(null)
        setCategoryLimits({})
        setTotalBudget(0)
      }

      setSuggestion(suggestRes.data)
      setExpenses(Array.isArray(expenseRes.data) ? expenseRes.data : [])
    } catch (err) {
      setErrorMsg("Could not load budget data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) loadData()
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

  const remainingBudget = useMemo(() => {
    return totalBudget - totalSpent
  }, [totalBudget, totalSpent])

  const safeToSpendPerDay = useMemo(() => {
    const daysRemaining = suggestion?.daysRemaining || 1
    return Math.max(0, remainingBudget / daysRemaining)
  }, [remainingBudget, suggestion?.daysRemaining])

  const overallStatus = useMemo(() => {
    if (totalBudget <= 0) return "none"
    const percent = (totalSpent / totalBudget) * 100
    if (percent >= 100) return "exceeded"
    if (percent >= 80) return "warning"
    return "on-track"
  }, [totalSpent, totalBudget])

  const handleLimitChange = (category, value) => {
    setCategoryLimits(prev => ({
      ...prev,
      [category]: Number(value) || 0
    }))
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

  const handleUseSuggestion = async () => {
    if (!suggestion) return
    setErrorMsg("")
    setSaving(true)

    const suggestedLimits = suggestion.categoryLimits || {}
    const suggestedTotal = suggestion.totalBudget || 0
    const limitsTotal = Object.values(suggestedLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
    const safeToSpend = Math.max(0, suggestedTotal - limitsTotal)

    const payload = {
      month: currentMonth,
      totalBudget: suggestedTotal,
      categoryLimits: JSON.stringify(suggestedLimits),
      safeToSpend
    }

    try {
      if (budget?.id) {
        await axios.put(`${API_BASE}/${budget.id}?userId=${user.id}`, payload)
      } else {
        await axios.post(`${API_BASE}?userId=${user.id}`, payload)
      }
      await loadData()
    } catch (err) {
      setErrorMsg("Failed to apply suggestion.")
    } finally {
      setSaving(false)
    }
  }

  const allCategories = useMemo(() => {
    const cats = new Set(["Food", "Travel", "Education", "Leisure", "Other"])
    Object.keys(categoryLimits).forEach(cat => cats.add(cat))
    Object.keys(spentByCategory).forEach(cat => cats.add(cat))
    return Array.from(cats)
  }, [categoryLimits, spentByCategory])

  const hasBudget = budget !== null

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
            {/* Suggested Budget Section */}
            {suggestion && !hasBudget && (
              <div className="suggestion-card">
                <div className="suggestion-header">
                  <div>
                    <h3>Suggested Budget</h3>
                    <p className="suggestion-desc">
                      Based on your income, bills, subscriptions, goals, and spending history (with {suggestion.reductionApplied || 10}% reduction to help you save)
                    </p>
                  </div>
                </div>

                <div className="suggestion-breakdown">
                  <div className="suggestion-item income-item">
                    <div className="suggestion-icon">💰</div>
                    <div className="suggestion-details">
                      <span className="suggestion-label">Monthly Income</span>
                      <span className="suggestion-value income">+£{suggestion.monthlyIncome?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>

                  <div className="suggestion-item expense-item">
                    <div className="suggestion-icon">📱</div>
                    <div className="suggestion-details">
                      <span className="suggestion-label">Subscriptions</span>
                      <span className="suggestion-value expense">-£{suggestion.monthlySubscriptions?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>

                  <div className="suggestion-item expense-item">
                    <div className="suggestion-icon">🧾</div>
                    <div className="suggestion-details">
                      <span className="suggestion-label">Bills & Utilities</span>
                      <span className="suggestion-value expense">-£{suggestion.monthlyBills?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>

                  <div className="suggestion-item expense-item">
                    <div className="suggestion-icon">🎯</div>
                    <div className="suggestion-details">
                      <span className="suggestion-label">Goal Contributions</span>
                      <span className="suggestion-value expense">-£{suggestion.monthlyGoalAllocations?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>

                  <div className="suggestion-divider" />

                  <div className="suggestion-item total-item">
                    <div className="suggestion-icon">✨</div>
                    <div className="suggestion-details">
                      <span className="suggestion-label">Available to Budget</span>
                      <span className="suggestion-value total">£{suggestion.totalBudget?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="use-suggestion-btn"
                  onClick={handleUseSuggestion}
                  disabled={saving}
                >
                  {saving ? "Applying..." : "Use This Budget"}
                </button>
              </div>
            )}

            {/* Live Stats - Only show when budget exists */}
            {hasBudget && (
              <>
                <div className="live-stats">
                  <div className={`live-stat-card main-stat ${overallStatus}`}>
                    <div className="stat-header">
                      <span className="stat-icon">💳</span>
                      <span className={`status-badge ${overallStatus}`}>
                        {getStatusLabel(overallStatus)}
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

                  <div className="live-stat-card">
                    <div className="stat-header">
                      <span className="stat-icon">📅</span>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Safe to Spend Daily</div>
                      <div className="stat-value">£{safeToSpendPerDay.toFixed(2)}</div>
                      <div className="stat-sub">{suggestion?.daysRemaining || 0} days left</div>
                    </div>
                  </div>

                  <div className="live-stat-card">
                    <div className="stat-header">
                      <span className="stat-icon">🛒</span>
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Spent So Far</div>
                      <div className="stat-value expense">£{totalSpent.toFixed(2)}</div>
                      <div className="stat-sub">{monthExpenses.length} transactions</div>
                    </div>
                  </div>
                </div>

                {errorMsg && <div className="error-msg">{errorMsg}</div>}

                {/* Category Limits Section */}
                <div className="budget-section">
                  <div className="section-header">
                    <h2>Category Budgets</h2>
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

                  <div className="category-limits">
                    {allCategories.map(category => {
                      const limit = categoryLimits[category] || 0
                      const spent = spentByCategory[category] || 0
                      const percent = limit > 0 ? (spent / limit) * 100 : 0
                      const status = getCategoryStatus(spent, limit)

                      return (
                        <div key={category} className={`category-limit-item ${status}`}>
                          <div className="category-info">
                            <span className="category-icon">{categoryIcons[category] || "📦"}</span>
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
                                </div>
                              </div>
                              <div className="limit-values">
                                <span className={status !== "on-track" ? status : ""}>
                                  £{spent.toFixed(2)}
                                </span>
                                <span className="limit-of">/ £{limit.toFixed(2)}</span>
                              </div>
                              {limit > 0 && (
                                <span className={`category-status-badge ${status}`}>
                                  {getStatusLabel(status)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Quick Actions */}
                {suggestion && (
                  <div className="quick-actions">
                    <button className="reset-btn" onClick={handleUseSuggestion} disabled={saving}>
                      Reset to Suggested Budget
                    </button>
                  </div>
                )}
              </>
            )}

            {/* No budget yet prompt */}
            {!hasBudget && !suggestion && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
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
