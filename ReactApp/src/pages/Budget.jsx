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

export default function Budget() {
  const { user } = useAuth()
  const currentMonth = getCurrentMonth()

  const [budget, setBudget] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

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
        setCategoryLimits(suggestRes.data.categoryLimits || {})
        setTotalBudget(suggestRes.data.totalBudget || 0)
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

  const safeToSpend = useMemo(() => {
    const limitsTotal = Object.values(categoryLimits).reduce((sum, v) => sum + (Number(v) || 0), 0)
    return Math.max(0, totalBudget - limitsTotal)
  }, [totalBudget, categoryLimits])

  const remainingBudget = useMemo(() => {
    return totalBudget - totalSpent
  }, [totalBudget, totalSpent])

  const handleLimitChange = (category, value) => {
    setCategoryLimits(prev => ({
      ...prev,
      [category]: Number(value) || 0
    }))
  }

  const handleSave = async () => {
    setErrorMsg("")
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
    }
  }

  const handleUseSuggestion = () => {
    if (suggestion) {
      setCategoryLimits(suggestion.categoryLimits || {})
      setTotalBudget(suggestion.totalBudget || 0)
      setEditMode(true)
    }
  }

  const allCategories = useMemo(() => {
    const cats = new Set(["Food", "Travel", "Education", "Leisure", "Other"])
    Object.keys(categoryLimits).forEach(cat => cats.add(cat))
    Object.keys(spentByCategory).forEach(cat => cats.add(cat))
    return Array.from(cats)
  }, [categoryLimits, spentByCategory])

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
            {suggestion && (
              <div className="suggestion-card">
                <div className="suggestion-header">
                  <h3>Suggested Budget</h3>
                  {!editMode && (
                    <button className="use-suggestion-btn" onClick={handleUseSuggestion}>
                      Use Suggestion
                    </button>
                  )}
                </div>
                <div className="suggestion-breakdown">
                  <div className="suggestion-item">
                    <span>Monthly Income</span>
                    <span className="income">£{suggestion.monthlyIncome?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="suggestion-item">
                    <span>Subscriptions</span>
                    <span className="expense">-£{suggestion.monthlySubscriptions?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="suggestion-item total">
                    <span>Available Budget</span>
                    <span>£{suggestion.totalBudget?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Budget</div>
                <div className="stat-value">£{totalBudget.toFixed(2)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Spent</div>
                <div className="stat-value expense">£{totalSpent.toFixed(2)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Remaining</div>
                <div className={`stat-value ${remainingBudget >= 0 ? "income" : "expense"}`}>
                  £{remainingBudget.toFixed(2)}
                </div>
              </div>
            </div>

            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            <div className="budget-section">
              <div className="section-header">
                <h2>Category Limits</h2>
                {!editMode ? (
                  <button className="edit-btn" onClick={() => setEditMode(true)}>Edit Budget</button>
                ) : (
                  <div className="edit-actions">
                    <button className="cancel-btn" onClick={() => { setEditMode(false); loadData() }}>Cancel</button>
                    <button className="save-btn" onClick={handleSave}>Save</button>
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
                  const isOver = spent > limit && limit > 0

                  return (
                    <div key={category} className={`category-limit-item ${isOver ? "over" : ""}`}>
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
                                className={`limit-fill ${isOver ? "over" : ""}`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="limit-values">
                            <span className={isOver ? "over" : ""}>£{spent.toFixed(2)}</span>
                            <span className="limit-of">/ £{limit.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {!editMode && (
                <div className="safe-to-spend">
                  <div className="safe-label">Safe to Spend (Unallocated)</div>
                  <div className="safe-value">£{safeToSpend.toFixed(2)}</div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
