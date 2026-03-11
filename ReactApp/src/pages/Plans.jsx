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

  // AI input state
  const [aiInput, setAiInput] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [parsedGoal, setParsedGoal] = useState(null)

  // Edit modal state
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

  // AI goal parsing
  const handleAiSubmit = async (e) => {
    e.preventDefault()
    if (!aiInput.trim() || aiLoading) return

    setAiLoading(true)
    setErrorMsg("")
    setParsedGoal(null)

    try {
      const res = await axios.post(`${API_BASE}/ai`, { input: aiInput.trim() })
      const parsed = JSON.parse(res.data.parsed)
      setParsedGoal(parsed)
    } catch (err) {
      setErrorMsg("Couldn't understand that. Try something like: 'Save £5000 for a holiday by December'")
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveParsed = async () => {
    if (!parsedGoal) return
    setErrorMsg("")

    const payload = {
      title: parsedGoal.title,
      targetAmount: Number(parsedGoal.targetAmount) || 0,
      currentAmount: Number(parsedGoal.currentAmount) || 0,
      targetDate: parsedGoal.targetDate || null,
      type: parsedGoal.type || "SAVINGS"
    }

    if (payload.targetAmount <= 0) {
      setErrorMsg("Target amount must be greater than 0.")
      return
    }

    try {
      await axios.post(`${API_BASE}?userId=${user.id}`, payload)
      await reloadPlans()
      setParsedGoal(null)
      setAiInput("")
    } catch (err) {
      setErrorMsg("Save failed. Please try again.")
    }
  }

  const handleDiscardParsed = () => {
    setParsedGoal(null)
  }

  // Manual edit form submit (for editing existing plans)
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

  const aiExamples = [
    "Save £5,000 for a holiday by December",
    "Pay off my £2,000 credit card in 6 months",
    "Buy a new laptop for £1,200 by March",
    "Build a £10,000 emergency fund"
  ]

  return (
    <div className="plans-page">
      <Navbar />
      <main className="plans-main">
        <div className="plans-header">
          <h1>Financial Goals</h1>
          <p>Describe your goal and AI will set it up for you</p>
        </div>

        {/* AI Input Bar */}
        <div className="ai-goal-section">
          <form onSubmit={handleAiSubmit} className="ai-goal-form">
            <div className="ai-input-wrapper">
              <div className="ai-input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313-12.454z"/><path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/></svg>
              </div>
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Describe your financial goal..."
                disabled={aiLoading}
              />
              <button type="submit" disabled={aiLoading || !aiInput.trim()}>
                {aiLoading ? (
                  <div className="ai-spinner"></div>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                )}
              </button>
            </div>
          </form>

          {!parsedGoal && !aiLoading && (
            <div className="ai-examples">
              {aiExamples.map((ex, i) => (
                <button key={i} className="ai-example-chip" onClick={() => setAiInput(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Parsed Preview */}
        {parsedGoal && (
          <div className="parsed-preview">
            <div className="parsed-header">
              <span className="parsed-badge">AI Generated</span>
              <span className="parsed-hint">Review and save your goal</span>
            </div>
            <div className="parsed-card">
              <div className="parsed-icon">{typeIcons[parsedGoal.type] || "🎯"}</div>
              <div className="parsed-details">
                <div className="parsed-title">{parsedGoal.title}</div>
                <div className="parsed-meta">
                  <span className="parsed-type">{typeLabels[parsedGoal.type] || parsedGoal.type}</span>
                  <span className="parsed-amount">£{Number(parsedGoal.targetAmount).toLocaleString()}</span>
                  {parsedGoal.targetDate && (
                    <span className="parsed-date">by {formatDisplayDate(parsedGoal.targetDate)}</span>
                  )}
                  {parsedGoal.currentAmount > 0 && (
                    <span className="parsed-current">£{Number(parsedGoal.currentAmount).toLocaleString()} saved</span>
                  )}
                </div>
              </div>
            </div>
            <div className="parsed-actions">
              <button className="btn-discard" onClick={handleDiscardParsed}>Discard</button>
              <button className="btn-save" onClick={handleSaveParsed}>Save Goal</button>
            </div>
          </div>
        )}

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
            <div className="empty-illustration">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="36" stroke="#d1fae5" strokeWidth="4" fill="#ecfdf5"/>
                <circle cx="40" cy="40" r="24" stroke="#6ee7b7" strokeWidth="3" fill="#d1fae5"/>
                <circle cx="40" cy="40" r="12" stroke="#34d399" strokeWidth="3" fill="#a7f3d0"/>
                <circle cx="40" cy="40" r="4" fill="#10b981"/>
                <line x1="40" y1="4" x2="40" y2="16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
                <polygon points="36,6 40,0 44,6" fill="#10b981"/>
              </svg>
            </div>
            <h3>No goals yet</h3>
            <p>Type a goal above and let AI set it up for you</p>
          </div>
        )}
      </main>

      {/* Edit Modal (for editing existing plans) */}
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
