import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import "./css/Plans.css"

const API_BASE = "http://localhost:8080/api/plans"

const planTypes = ["SAVINGS", "DEBT", "PURCHASE", "EMERGENCY"]

const getDateString = (daysOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split("T")[0]
}

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const getDaysRemaining = (targetDate) => {
  if (!targetDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

export default function Plans() {
  const today = getDateString(0)
  const { user } = useAuth()

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [type, setType] = useState("SAVINGS")

  const [addAmountId, setAddAmountId] = useState(null)
  const [addAmountValue, setAddAmountValue] = useState("")

  const reloadPlans = async () => {
    if (!user?.id) return
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await axios.get(`${API_BASE}?userId=${user.id}`)
      setPlans(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setPlans([])
      setErrorMsg("Could not load plans.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) reloadPlans()
  }, [user?.id])

  const totalSaved = useMemo(() => {
    return plans.reduce((sum, p) => sum + (p.currentAmount || 0), 0)
  }, [plans])

  const totalTarget = useMemo(() => {
    return plans.reduce((sum, p) => sum + (p.targetAmount || 0), 0)
  }, [plans])

  const resetForm = () => {
    setTitle("")
    setTargetAmount("")
    setCurrentAmount("")
    setTargetDate("")
    setType("SAVINGS")
    setEditId(null)
    setErrorMsg("")
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg("")

    if (!title.trim()) {
      setErrorMsg("Title is required.")
      return
    }
    if (!targetAmount || Number(targetAmount) <= 0) {
      setErrorMsg("Enter a valid target amount.")
      return
    }

    const payload = {
      title: title.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      targetDate: targetDate || null,
      type
    }

    try {
      if (editId) {
        await axios.put(`${API_BASE}/${editId}?userId=${user.id}`, payload)
      } else {
        await axios.post(`${API_BASE}?userId=${user.id}`, payload)
      }
      await reloadPlans()
      closeForm()
    } catch (err) {
      setErrorMsg("Save failed. Please try again.")
    }
  }

  const handleDelete = async (id) => {
    setErrorMsg("")
    try {
      await axios.delete(`${API_BASE}/${id}?userId=${user.id}`)
      await reloadPlans()
    } catch (err) {
      setErrorMsg("Delete failed.")
    }
  }

  const handleEdit = (plan) => {
    setEditId(plan.id)
    setTitle(plan.title || "")
    setTargetAmount(plan.targetAmount?.toString() || "")
    setCurrentAmount(plan.currentAmount?.toString() || "")
    setTargetDate(plan.targetDate || "")
    setType(plan.type || "SAVINGS")
    setShowForm(true)
  }

  const handleAddProgress = async (id) => {
    if (!addAmountValue || Number(addAmountValue) <= 0) return
    try {
      await axios.patch(`${API_BASE}/${id}/progress?userId=${user.id}&amount=${Number(addAmountValue)}`)
      await reloadPlans()
      setAddAmountId(null)
      setAddAmountValue("")
    } catch (err) {
      setErrorMsg("Update failed.")
    }
  }

  const typeIcons = {
    SAVINGS: "🎯",
    DEBT: "💳",
    PURCHASE: "🛒",
    EMERGENCY: "🚨"
  }

  const typeLabels = {
    SAVINGS: "Savings Goal",
    DEBT: "Debt Payoff",
    PURCHASE: "Purchase Goal",
    EMERGENCY: "Emergency Fund"
  }

  return (
    <div className="plans-page">
      <Navbar />
      <main className="plans-main">
        <div className="plans-header">
          <h1>Financial Goals</h1>
          <p>Track your savings and financial targets</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Saved</div>
            <div className="stat-value saved">£{totalSaved.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Target</div>
            <div className="stat-value">£{totalTarget.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Goals</div>
            <div className="stat-value">{plans.length}</div>
          </div>
        </div>

        <div className="plans-controls">
          <button className="add-btn" onClick={() => setShowForm(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Goal
          </button>
        </div>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        {loading ? (
          <div className="loading-msg">Loading goals...</div>
        ) : plans.length > 0 ? (
          <div className="plans-list">
            {plans.map((plan) => {
              const progress = plan.targetAmount > 0 ? (plan.currentAmount / plan.targetAmount) * 100 : 0
              const daysLeft = getDaysRemaining(plan.targetDate)
              const isComplete = progress >= 100

              return (
                <div key={plan.id} className={`plan-card ${isComplete ? "complete" : ""}`}>
                  <div className="plan-header">
                    <div className="plan-icon">{typeIcons[plan.type] || "🎯"}</div>
                    <div className="plan-info">
                      <div className="plan-title">{plan.title}</div>
                      <div className="plan-type">{typeLabels[plan.type] || plan.type}</div>
                    </div>
                    <div className="plan-actions">
                      <button className="action-btn edit" onClick={() => handleEdit(plan)}>Edit</button>
                      <button className="action-btn delete" onClick={() => handleDelete(plan.id)}>Delete</button>
                    </div>
                  </div>

                  <div className="plan-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <div className="progress-stats">
                      <span className="progress-amount">
                        £{plan.currentAmount.toFixed(2)} / £{plan.targetAmount.toFixed(2)}
                      </span>
                      <span className="progress-percent">{progress.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="plan-footer">
                    {plan.targetDate && (
                      <span className={`plan-deadline ${daysLeft !== null && daysLeft < 30 ? "soon" : ""}`}>
                        {daysLeft !== null && daysLeft >= 0
                          ? `${daysLeft} days left`
                          : daysLeft !== null && daysLeft < 0
                          ? "Past due"
                          : formatDisplayDate(plan.targetDate)}
                      </span>
                    )}

                    {!isComplete && (
                      addAmountId === plan.id ? (
                        <div className="add-progress-form">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={addAmountValue}
                            onChange={(e) => setAddAmountValue(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => handleAddProgress(plan.id)}>Add</button>
                          <button className="cancel" onClick={() => { setAddAmountId(null); setAddAmountValue("") }}>Cancel</button>
                        </div>
                      ) : (
                        <button className="add-progress-btn" onClick={() => setAddAmountId(plan.id)}>
                          + Add Progress
                        </button>
                      )
                    )}

                    {isComplete && <span className="complete-badge">Complete!</span>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No goals yet</h3>
            <p>Set financial goals to track your progress</p>
            <button className="add-btn" onClick={() => setShowForm(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Goal
            </button>
          </div>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Goal" : "New Goal"}</h2>
              <button className="modal-close" onClick={closeForm}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="plan-form">
              <div className="form-group">
                <label>Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g., Emergency Fund, New Car"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Type</label>
                <div className="type-grid">
                  {planTypes.map((t) => (
                    <div
                      key={t}
                      className={`type-option ${type === t ? "selected" : ""}`}
                      onClick={() => setType(t)}
                    >
                      <span className="type-icon">{typeIcons[t]}</span>
                      <span>{typeLabels[t]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Current Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Target Date <span className="optional-label">(optional)</span></label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              {errorMsg && <div className="form-error">{errorMsg}</div>}

              <div className="form-buttons">
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn-primary">{editId ? "Update" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
