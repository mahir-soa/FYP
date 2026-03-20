import React, { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import { fmt } from "../utils/format"
import "./css/Plans.css"

const API_BASE = "http://localhost:8080/api/plans"

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const getDaysRemaining = (endDate) => {
  if (!endDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(endDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

const categoryIcons = {
  SAVINGS: "🎯", DEBT: "💳", PURCHASE: "🛒", EMERGENCY: "🚨"
}
const categoryLabels = {
  SAVINGS: "Savings Goal", DEBT: "Debt Payoff", PURCHASE: "Purchase Goal", EMERGENCY: "Emergency Fund"
}
const cadenceLabels = {
  ONE_TIME: "One-time", MONTHLY_RECURRING: "Monthly Recurring"
}
const terminationLabels = {
  ON_DATE: "Until Date", AFTER_PERIOD: "Fixed Period", UNTIL_TARGET: "Until Target", OPEN_ENDED: "Open-ended"
}
const directionLabels = {
  INCREASE: "Increase", REDUCE: "Reduce", PROTECT: "Protect"
}
const intensityLabels = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High"
}

const SPENDING_CATEGORIES = ["Food", "Travel", "Education", "Leisure", "Other"]

const aiExamples = [
  "Save £5,000 for a holiday by December",
  "Pay off my £2,000 credit card in 6 months",
  "I'm bulking this month, spend more on food",
  "Reduce leisure spending for the next 3 months",
  "Build a £10,000 emergency fund",
  "Tight budget until payday"
]

export default function Plans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // AI input
  const [aiInput, setAiInput] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [parsedDrafts, setParsedDrafts] = useState([])
  const [clarificationState, setClarificationState] = useState(null)

  // Edit modal
  const [editPlan, setEditPlan] = useState(null)

  // Add progress
  const [addAmountId, setAddAmountId] = useState(null)
  const [addAmountValue, setAddAmountValue] = useState("")

  // Show completed
  const [showCompleted, setShowCompleted] = useState(false)

  const reloadPlans = async () => {
    if (!user?.id) return
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await axios.get(`${API_BASE}?userId=${user.id}`)
      setPlans(Array.isArray(res.data) ? res.data : [])
    } catch {
      setPlans([])
      setErrorMsg("Could not load plans.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) reloadPlans()
  }, [user?.id])

  // AI submit — uses /parse endpoint, returns List<PlanDraftDTO>
  const handleAiSubmit = async (e) => {
    e.preventDefault()
    if (!aiInput.trim() || aiLoading) return
    setAiLoading(true)
    setErrorMsg("")
    setParsedDrafts([])
    setClarificationState(null)
    try {
      const res = await axios.post(`${API_BASE}/parse`, { input: aiInput.trim() })
      const drafts = res.data

      // Check if any draft needs clarification
      const needsClarification = drafts.some(d => d.family === "UNKNOWN" || d.clarificationNeeded === true)

      if (needsClarification) {
        // Enter clarification state
        setClarificationState({
          originalInput: aiInput.trim(),
          drafts: drafts,
        })
      } else {
        // Go directly to draft cards
        setParsedDrafts(drafts.map(d => ({ ...d, _originalInput: aiInput.trim() })))
      }
    } catch {
      setErrorMsg("Couldn't understand that. Try rephrasing your plan.")
    } finally {
      setAiLoading(false)
    }
  }

  // Resolve clarification: user picks family or fills missing fields
  const resolveClarification = (draftIndex, field, value) => {
    setClarificationState(prev => {
      const updated = { ...prev, drafts: [...prev.drafts] }
      updated.drafts[draftIndex] = { ...updated.drafts[draftIndex], [field]: value }

      // If family was set, check if clarification is fully resolved
      const draft = updated.drafts[draftIndex]
      if (draft.family !== "UNKNOWN" && draft.cadence && draft.termination) {
        draft.clarificationNeeded = false
      }

      return updated
    })
  }

  const promoteClarificationToDraft = () => {
    if (!clarificationState) return
    const resolved = clarificationState.drafts.filter(d => !d.clarificationNeeded || d.family !== "UNKNOWN")
    if (resolved.length === 0) {
      setErrorMsg("Please resolve all clarification questions before continuing.")
      return
    }
    setParsedDrafts(resolved.map(d => ({ ...d, _originalInput: clarificationState.originalInput })))
    setClarificationState(null)
  }

  const skipToManual = (family) => {
    setClarificationState(null)
    setParsedDrafts([{
      family: family,
      confidence: 1.0,
      title: "",
      cadence: null,
      termination: null,
      clarificationNeeded: false,
      missingFields: [],
      clarificationQuestions: [],
      _originalInput: clarificationState?.originalInput || aiInput.trim(),
    }])
  }

  // Save draft via /confirm
  const handleSaveDraft = async (draftIndex) => {
    const draft = parsedDrafts[draftIndex]
    if (!draft) return
    setErrorMsg("")

    const isOutcome = draft.family === "OUTCOME_PLAN"
    const payload = {
      title: draft.title,
      description: draft._originalInput || "",
      family: draft.family,
      cadence: draft.cadence,
      termination: draft.termination,
      outcomeCategory: isOutcome ? (draft.outcomeCategory || "SAVINGS") : null,
      targetAmount: isOutcome ? (Number(draft.targetAmount) || 0) : null,
      currentAmount: isOutcome ? (Number(draft.currentAmount) || 0) : null,
      monthlyContribution: draft.monthlyContribution ? Number(draft.monthlyContribution) : null,
      priorityCategories: !isOutcome ? (draft.priorityCategories || []) : null,
      direction: !isOutcome ? draft.direction : null,
      intensity: !isOutcome ? (draft.intensity || "MEDIUM") : null,
      priorityAmount: !isOutcome && draft.priorityAmount ? Number(draft.priorityAmount) : null,
      reasonNote: draft.reasonNote || null,
      startDate: draft.startDate || null,
      endDate: draft.endDate || null,
      targetDate: draft.targetDate || null,
      durationMonths: draft.durationMonths || null,
      isFlexible: draft.isFlexible !== false,
    }

    try {
      await axios.post(`${API_BASE}/confirm?userId=${user.id}`, payload)
      await reloadPlans()
      // Remove saved draft
      setParsedDrafts(prev => prev.filter((_, i) => i !== draftIndex))
      if (parsedDrafts.length <= 1) setAiInput("")
    } catch (err) {
      const msg = err.response?.data?.error || "Save failed. Please check all required fields."
      setErrorMsg(msg)
    }
  }

  // Update draft field inline
  const updateDraft = (draftIndex, field, value) => {
    setParsedDrafts(prev => {
      const updated = [...prev]
      updated[draftIndex] = { ...updated[draftIndex], [field]: value }
      return updated
    })
  }

  // Toggle priority category chip
  const togglePriorityCategory = (draftIndex, category) => {
    setParsedDrafts(prev => {
      const updated = [...prev]
      const draft = { ...updated[draftIndex] }
      const cats = [...(draft.priorityCategories || [])]
      const idx = cats.indexOf(category)
      if (idx >= 0) {
        cats.splice(idx, 1)
      } else {
        cats.push(category)
      }
      draft.priorityCategories = cats
      updated[draftIndex] = draft
      return updated
    })
  }

  // Edit modal
  const openEdit = (plan) => {
    let priorityCats = []
    if (plan.priorityCategories) {
      try { priorityCats = JSON.parse(plan.priorityCategories) } catch {}
    }
    setEditPlan({
      ...plan,
      priorityCategoriesParsed: priorityCats,
      targetAmount: plan.targetAmount || 0,
      currentAmount: plan.currentAmount || 0,
    })
  }

  const handleEditSave = async () => {
    if (!editPlan) return
    setErrorMsg("")

    const isOutcome = editPlan.family === "OUTCOME_PLAN"
    const payload = {
      title: editPlan.title,
      family: editPlan.family,
      cadence: editPlan.cadence,
      termination: editPlan.termination,
      category: isOutcome ? editPlan.category : null,
      targetAmount: isOutcome ? Number(editPlan.targetAmount) : 0,
      currentAmount: isOutcome ? Number(editPlan.currentAmount) : 0,
      monthlyContribution: editPlan.monthlyContribution ? Number(editPlan.monthlyContribution) : null,
      priorityCategories: !isOutcome ? editPlan.priorityCategoriesParsed : null,
      direction: !isOutcome ? editPlan.direction : null,
      intensity: !isOutcome ? editPlan.intensity : null,
      priorityAmount: !isOutcome && editPlan.priorityAmount ? Number(editPlan.priorityAmount) : null,
      reasonNote: editPlan.reasonNote || null,
      durationMonths: editPlan.durationMonths || null,
      startDate: editPlan.startDate || null,
      endDate: editPlan.endDate || null,
      targetDate: editPlan.targetDate || null,
      isFlexible: editPlan.isFlexible !== false,
      isActive: editPlan.isActive !== false,
    }

    try {
      await axios.put(`${API_BASE}/${editPlan.id}?userId=${user.id}`, payload)
      await reloadPlans()
      setEditPlan(null)
    } catch {
      setErrorMsg("Update failed.")
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}?userId=${user.id}`)
      await reloadPlans()
    } catch {
      setErrorMsg("Delete failed.")
    }
  }

  const handleAddProgress = async (id) => {
    if (!addAmountValue || Number(addAmountValue) <= 0) return
    try {
      await axios.patch(`${API_BASE}/${id}/progress?userId=${user.id}&amount=${Number(addAmountValue)}`)
      await reloadPlans()
      setAddAmountId(null)
      setAddAmountValue("")
    } catch {
      setErrorMsg("Update failed.")
    }
  }

  const handleComplete = async (id) => {
    try {
      await axios.patch(`${API_BASE}/${id}/complete?userId=${user.id}`)
      await reloadPlans()
    } catch {
      setErrorMsg("Could not complete plan.")
    }
  }

  // Split plans
  const activePlans = plans.filter(p => p.isActive !== false && !p.completedAt)
  const completedPlans = plans.filter(p => p.isActive === false || p.completedAt)
  const outcomeActive = activePlans.filter(p => p.family === "OUTCOME_PLAN")
  const priorityActive = activePlans.filter(p => p.family === "PRIORITY_PLAN")

  // Parse priority categories for display
  const parsePriorityCats = (plan) => {
    if (plan.priorityCategories) {
      try { return JSON.parse(plan.priorityCategories) } catch {}
    }
    return []
  }

  return (
    <div className="plans-page">
      <Navbar />
      <main className="plans-main">
        <div className="plans-header">
          <h1>Plans</h1>
          <p>Describe any financial goal or spending priority and AI will set it up</p>
        </div>

        {/* AI Input */}
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
                placeholder="Describe your plan in plain English..."
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

          {parsedDrafts.length === 0 && !clarificationState && !aiLoading && (
            <div className="ai-examples">
              {aiExamples.map((ex, i) => (
                <button key={i} className="ai-example-chip" onClick={() => setAiInput(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clarification State (first-class UI) */}
        {clarificationState && (
          <div className="clarification-card">
            <div className="clarification-header">
              <span className="clarification-badge">Needs Clarification</span>
              <button className="clarification-dismiss" onClick={() => setClarificationState(null)}>Dismiss</button>
            </div>

            <div className="clarification-original">
              <span className="clarification-label">Your input:</span>
              <span className="clarification-text">"{clarificationState.originalInput}"</span>
            </div>

            {clarificationState.drafts.map((draft, di) => (
              <div key={di} className="clarification-draft">
                {/* Clarification questions */}
                {draft.clarificationQuestions && draft.clarificationQuestions.length > 0 && (
                  <div className="clarification-questions">
                    {draft.clarificationQuestions.map((q, qi) => (
                      <div key={qi} className="clarification-question">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Family choice if UNKNOWN */}
                {draft.family === "UNKNOWN" && (
                  <div className="clarification-family-choice">
                    <p>Is this a savings goal or a spending priority?</p>
                    <div className="family-choice-buttons">
                      <button
                        className="family-choice-btn outcome"
                        onClick={() => resolveClarification(di, "family", "OUTCOME_PLAN")}
                      >Savings Goal</button>
                      <button
                        className="family-choice-btn priority"
                        onClick={() => resolveClarification(di, "family", "PRIORITY_PLAN")}
                      >Spending Priority</button>
                    </div>
                  </div>
                )}

                {/* Missing fields */}
                {draft.missingFields && draft.missingFields.length > 0 && (
                  <div className="clarification-missing">
                    <span className="clarification-label">Missing:</span>
                    {draft.missingFields.map((f, fi) => (
                      <span key={fi} className="missing-field-chip">{f}</span>
                    ))}
                  </div>
                )}

                {/* Cadence / Termination selectors if missing */}
                {draft.missingFields?.includes("cadence") && (
                  <div className="clarification-inline-field">
                    <label>How often?</label>
                    <select value={draft.cadence || ""} onChange={(e) => resolveClarification(di, "cadence", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="ONE_TIME">One-time</option>
                      <option value="MONTHLY_RECURRING">Monthly Recurring</option>
                    </select>
                  </div>
                )}

                {draft.missingFields?.includes("termination") && (
                  <div className="clarification-inline-field">
                    <label>When does it end?</label>
                    <select value={draft.termination || ""} onChange={(e) => resolveClarification(di, "termination", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="ON_DATE">Until a specific date</option>
                      <option value="AFTER_PERIOD">After a fixed period</option>
                      <option value="UNTIL_TARGET">Until target is reached</option>
                      <option value="OPEN_ENDED">Open-ended / ongoing</option>
                    </select>
                  </div>
                )}
              </div>
            ))}

            <div className="clarification-actions">
              <button className="btn-manual" onClick={() => skipToManual("OUTCOME_PLAN")}>Skip to manual</button>
              <button
                className="btn-continue"
                onClick={promoteClarificationToDraft}
                disabled={clarificationState.drafts.some(d => d.family === "UNKNOWN")}
              >Continue to Draft</button>
            </div>
          </div>
        )}

        {/* Draft Cards */}
        {parsedDrafts.map((draft, di) => (
          <div key={di} className="draft-card">
            <div className="draft-header">
              <div className="draft-header-left">
                <span className="parsed-badge">AI Draft</span>
                {draft.confidence != null && (
                  <span className={`confidence-badge ${draft.confidence >= 0.7 ? "confidence-high" : draft.confidence >= 0.4 ? "confidence-medium" : "confidence-low"}`}>
                    {Math.round(draft.confidence * 100)}%
                  </span>
                )}
              </div>
              <div className="draft-family-toggle">
                <button
                  className={draft.family === "OUTCOME_PLAN" ? "active" : ""}
                  onClick={() => updateDraft(di, "family", "OUTCOME_PLAN")}
                >Goal</button>
                <button
                  className={draft.family === "PRIORITY_PLAN" ? "active" : ""}
                  onClick={() => updateDraft(di, "family", "PRIORITY_PLAN")}
                >Spending Priority</button>
              </div>
            </div>

            {draft.parserNotes && (
              <div className="draft-parser-notes">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                {draft.parserNotes}
              </div>
            )}

            <div className="draft-fields">
              <div className="draft-field">
                <label>Title</label>
                <input
                  type="text"
                  value={draft.title || ""}
                  onChange={(e) => updateDraft(di, "title", e.target.value)}
                />
              </div>

              <div className="draft-field-row">
                <div className="draft-field">
                  <label>Cadence</label>
                  <select
                    value={draft.cadence || ""}
                    onChange={(e) => updateDraft(di, "cadence", e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="ONE_TIME">One-time</option>
                    <option value="MONTHLY_RECURRING">Monthly Recurring</option>
                  </select>
                </div>
                <div className="draft-field">
                  <label>Termination</label>
                  <select
                    value={draft.termination || ""}
                    onChange={(e) => updateDraft(di, "termination", e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="ON_DATE">Until Date</option>
                    <option value="AFTER_PERIOD">Fixed Period</option>
                    <option value="UNTIL_TARGET">Until Target</option>
                    <option value="OPEN_ENDED">Open-ended</option>
                  </select>
                </div>

                {draft.family === "OUTCOME_PLAN" && (
                  <div className="draft-field">
                    <label>Category</label>
                    <select
                      value={draft.outcomeCategory || "SAVINGS"}
                      onChange={(e) => updateDraft(di, "outcomeCategory", e.target.value)}
                    >
                      <option value="SAVINGS">Savings</option>
                      <option value="DEBT">Debt Payoff</option>
                      <option value="PURCHASE">Purchase</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>
                )}
              </div>

              {draft.family === "OUTCOME_PLAN" && (
                <>
                  <div className="draft-field-row">
                    <div className="draft-field">
                      <label>Target Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={draft.targetAmount ?? ""}
                        onChange={(e) => updateDraft(di, "targetAmount", e.target.value)}
                        className={draft.missingFields?.includes("targetAmount") ? "field-missing" : ""}
                      />
                    </div>
                    <div className="draft-field">
                      <label>Monthly Contribution <span className="optional-label">(optional)</span></label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={draft.monthlyContribution ?? ""}
                        onChange={(e) => updateDraft(di, "monthlyContribution", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {draft.family === "PRIORITY_PLAN" && (
                <>
                  <div className="draft-field">
                    <label>Categories</label>
                    <div className="priority-category-chips">
                      {SPENDING_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          className={`category-chip ${(draft.priorityCategories || []).includes(cat) ? "selected" : ""}`}
                          onClick={() => togglePriorityCategory(di, cat)}
                        >{cat}</button>
                      ))}
                    </div>
                  </div>
                  <div className="draft-field-row">
                    <div className="draft-field">
                      <label>Direction</label>
                      <select
                        value={draft.direction || ""}
                        onChange={(e) => updateDraft(di, "direction", e.target.value)}
                      >
                        <option value="">Select...</option>
                        <option value="INCREASE">Increase</option>
                        <option value="REDUCE">Reduce</option>
                        <option value="PROTECT">Protect</option>
                      </select>
                    </div>
                    <div className="draft-field">
                      <label>Intensity</label>
                      <select
                        value={draft.intensity || "MEDIUM"}
                        onChange={(e) => updateDraft(di, "intensity", e.target.value)}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="draft-field-row">
                    <div className="draft-field">
                      <label>Target Amount <span className="optional-label">(optional)</span></label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 200"
                        value={draft.priorityAmount ?? ""}
                        onChange={(e) => updateDraft(di, "priorityAmount", e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <div className="draft-field">
                      <label>Reason <span className="optional-label">(optional)</span></label>
                      <input
                        type="text"
                        value={draft.reasonNote || ""}
                        onChange={(e) => updateDraft(di, "reasonNote", e.target.value)}
                        placeholder="e.g. bulking, exam period..."
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Duration months for AFTER_PERIOD */}
              {draft.termination === "AFTER_PERIOD" && (
                <div className="draft-field">
                  <label>Duration (months)</label>
                  <input
                    type="number"
                    min="1"
                    value={draft.durationMonths ?? ""}
                    onChange={(e) => updateDraft(di, "durationMonths", Number(e.target.value) || null)}
                  />
                </div>
              )}

              <div className="draft-field-row">
                <div className="draft-field">
                  <label>Start Date <span className="optional-label">(optional)</span></label>
                  <input
                    type="date"
                    value={draft.startDate || ""}
                    onChange={(e) => updateDraft(di, "startDate", e.target.value)}
                  />
                </div>
                {draft.termination === "UNTIL_TARGET" ? (
                  <div className="draft-field">
                    <label>Target Date <span className="optional-label">(aspirational deadline)</span></label>
                    <input
                      type="date"
                      value={draft.targetDate || ""}
                      onChange={(e) => updateDraft(di, "targetDate", e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="draft-field">
                    <label>End Date <span className="optional-label">(optional)</span></label>
                    <input
                      type="date"
                      value={draft.endDate || ""}
                      onChange={(e) => updateDraft(di, "endDate", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="draft-field draft-flex-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.isFlexible !== false}
                    onChange={(e) => updateDraft(di, "isFlexible", e.target.checked)}
                  />
                  Flexible (engine can auto-adjust if budget is tight)
                </label>
              </div>
            </div>

            <div className="draft-actions">
              <button className="btn-discard" onClick={() => setParsedDrafts(prev => prev.filter((_, i) => i !== di))}>Discard</button>
              <button className="btn-save" onClick={() => handleSaveDraft(di)}>Save Plan</button>
            </div>
          </div>
        ))}

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        {loading ? (
          <div className="loading-msg">Loading plans...</div>
        ) : (
          <>
            {/* OUTCOME Plans - Goals */}
            {outcomeActive.length > 0 && (
              <div className="plans-section">
                <h2 className="section-title">Goals</h2>
                <div className="plans-list">
                  {outcomeActive.map((plan) => {
                    const progress = plan.targetAmount > 0 ? (plan.currentAmount / plan.targetAmount) * 100 : 0
                    const daysLeft = getDaysRemaining(plan.endDate || plan.targetDate)
                    const isComplete = progress >= 100

                    return (
                      <div key={plan.id} className={`plan-card ${isComplete ? "complete" : ""}`}>
                        <div className="plan-header">
                          <div className="plan-icon">{categoryIcons[plan.category] || "🎯"}</div>
                          <div className="plan-info">
                            <div className="plan-title">{plan.title}</div>
                            <div className="plan-meta">
                              <span className="plan-category-label">{categoryLabels[plan.category] || plan.category}</span>
                              <span className="plan-type-label">
                                {cadenceLabels[plan.cadence] || plan.cadence}
                                {plan.termination && ` / ${terminationLabels[plan.termination] || plan.termination}`}
                              </span>
                              {!plan.isFlexible && <span className="plan-protected-badge">Protected</span>}
                            </div>
                          </div>
                          <div className="plan-actions">
                            <button className="action-btn edit" onClick={() => openEdit(plan)}>Edit</button>
                            <button className="action-btn delete" onClick={() => handleDelete(plan.id)}>Delete</button>
                          </div>
                        </div>

                        <div className="plan-progress">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                          <div className="progress-stats">
                            <span className="progress-amount">
                              £{fmt(plan.currentAmount)} / £{fmt(plan.targetAmount)}
                            </span>
                            <span className="progress-percent">{progress.toFixed(0)}%</span>
                          </div>
                        </div>

                        <div className="plan-footer">
                          {(plan.endDate || plan.targetDate) && (() => {
                            const deadline = plan.targetDate || plan.endDate
                            const days = getDaysRemaining(deadline)
                            const label = plan.targetDate ? "target" : "left"
                            return (
                              <span className={`plan-deadline ${days !== null && days < 30 ? "soon" : ""}`}>
                                {days !== null && days >= 0
                                  ? `${days} days ${label}`
                                  : days !== null && days < 0
                                  ? "Past due"
                                  : formatDisplayDate(deadline)}
                              </span>
                            )
                          })()}
                          {!plan.endDate && !plan.targetDate && plan.termination === "OPEN_ENDED" && (
                            <span className="plan-deadline">Ongoing</span>
                          )}
                          {!plan.endDate && !plan.targetDate && plan.termination === "UNTIL_TARGET" && (
                            <span className="plan-deadline">No deadline</span>
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
              </div>
            )}

            {/* PRIORITY Plans - Spending Priorities */}
            {priorityActive.length > 0 && (
              <div className="plans-section">
                <h2 className="section-title">Spending Priorities</h2>
                <div className="plans-list">
                  {priorityActive.map((plan) => {
                    const priorityCats = parsePriorityCats(plan)
                    const daysLeft = getDaysRemaining(plan.endDate)

                    return (
                      <div key={plan.id} className="plan-card priority-card">
                        <div className="plan-header">
                          <div className="plan-icon priority-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                          </div>
                          <div className="plan-info">
                            <div className="plan-title">{plan.title}</div>
                            <div className="plan-meta">
                              <span className="plan-type-label">
                                {cadenceLabels[plan.cadence] || plan.cadence}
                                {plan.termination && ` / ${terminationLabels[plan.termination] || plan.termination}`}
                              </span>
                              {plan.startDate && plan.endDate && (
                                <span className="plan-date-range">
                                  {formatDisplayDate(plan.startDate)} - {formatDisplayDate(plan.endDate)}
                                </span>
                              )}
                              {plan.termination === "OPEN_ENDED" && !plan.endDate && (
                                <span className="plan-date-range">Ongoing</span>
                              )}
                            </div>
                          </div>
                          <div className="plan-actions">
                            <button className="action-btn edit" onClick={() => openEdit(plan)}>Edit</button>
                            <button className="action-btn complete-btn" onClick={() => handleComplete(plan.id)}>End</button>
                            <button className="action-btn delete" onClick={() => handleDelete(plan.id)}>Delete</button>
                          </div>
                        </div>

                        {/* New: show direction, intensity, categories as chips */}
                        {plan.direction && (
                          <div className="priority-adjustments">
                            {priorityCats.map((cat, i) => (
                              <div key={i} className={`priority-chip ${plan.direction === "INCREASE" ? "increase" : plan.direction === "REDUCE" ? "decrease" : "protect"}`}>
                                <span className="priority-chip-category">{cat}</span>
                                <span className="priority-chip-arrow">
                                  {plan.direction === "INCREASE" ? "\u2191" : plan.direction === "REDUCE" ? "\u2193" : "\u2194"}
                                </span>
                                <span className="priority-chip-intensity">{intensityLabels[plan.intensity] || plan.intensity}</span>
                              </div>
                            ))}
                            {plan.priorityAmount > 0 && (
                              <span className="priority-amount-badge">£{fmt(plan.priorityAmount)}</span>
                            )}
                            {plan.reasonNote && (
                              <span className="priority-reason-note">{plan.reasonNote}</span>
                            )}
                          </div>
                        )}

                        {/* Legacy fallback for old priorityAdjustments */}
                        {!plan.direction && plan.priorityAdjustments && (() => {
                          let adjustments = []
                          try { adjustments = JSON.parse(plan.priorityAdjustments) } catch {}
                          return adjustments.length > 0 ? (
                            <div className="priority-adjustments">
                              {adjustments.map((adj, i) => (
                                <div key={i} className={`priority-chip ${adj.direction}`}>
                                  <span className="priority-chip-category">{adj.category}</span>
                                  <span className="priority-chip-arrow">
                                    {adj.direction === "increase" ? "\u2191" : "\u2193"}
                                  </span>
                                  <span className="priority-chip-intensity">{adj.intensity}</span>
                                  {adj.reason && <span className="priority-chip-reason">{adj.reason}</span>}
                                </div>
                              ))}
                            </div>
                          ) : null
                        })()}

                        {daysLeft !== null && daysLeft >= 0 && (
                          <div className="plan-footer">
                            <span className={`plan-deadline ${daysLeft < 7 ? "soon" : ""}`}>
                              {daysLeft} days remaining
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {activePlans.length === 0 && !loading && (
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
                <h3>No plans yet</h3>
                <p>Describe a savings goal or spending priority above and AI will set it up</p>
              </div>
            )}

            {/* Completed Plans */}
            {completedPlans.length > 0 && (
              <div className="plans-section completed-section">
                <button
                  className="section-toggle"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  <h2 className="section-title">Completed / Expired ({completedPlans.length})</h2>
                  <svg
                    width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{ transform: showCompleted ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {showCompleted && (
                  <div className="plans-list completed-list">
                    {completedPlans.map((plan) => (
                      <div key={plan.id} className="plan-card completed-card">
                        <div className="plan-header">
                          <div className="plan-icon">
                            {plan.family === "OUTCOME_PLAN"
                              ? (categoryIcons[plan.category] || "🎯")
                              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                            }
                          </div>
                          <div className="plan-info">
                            <div className="plan-title">{plan.title}</div>
                            <div className="plan-meta">
                              <span className="plan-type-label">
                                {plan.family === "OUTCOME_PLAN" ? (categoryLabels[plan.category] || "Goal") : "Priority"}
                              </span>
                              <span className="complete-badge-small">Done</span>
                            </div>
                          </div>
                          <div className="plan-actions">
                            <button className="action-btn delete" onClick={() => handleDelete(plan.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editPlan && (
        <div className="modal-overlay" onClick={() => setEditPlan(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Plan</h2>
              <button className="modal-close" onClick={() => setEditPlan(null)}>&times;</button>
            </div>
            <div className="plan-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editPlan.title || ""}
                  onChange={(e) => setEditPlan(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Family</label>
                  <select
                    value={editPlan.family || "OUTCOME_PLAN"}
                    onChange={(e) => setEditPlan(prev => ({ ...prev, family: e.target.value }))}
                  >
                    <option value="OUTCOME_PLAN">Goal</option>
                    <option value="PRIORITY_PLAN">Spending Priority</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cadence</label>
                  <select
                    value={editPlan.cadence || ""}
                    onChange={(e) => setEditPlan(prev => ({ ...prev, cadence: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    <option value="ONE_TIME">One-time</option>
                    <option value="MONTHLY_RECURRING">Monthly Recurring</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Termination</label>
                  <select
                    value={editPlan.termination || ""}
                    onChange={(e) => setEditPlan(prev => ({ ...prev, termination: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    <option value="ON_DATE">Until Date</option>
                    <option value="AFTER_PERIOD">Fixed Period</option>
                    <option value="UNTIL_TARGET">Until Target</option>
                    <option value="OPEN_ENDED">Open-ended</option>
                  </select>
                </div>
              </div>

              {editPlan.family === "OUTCOME_PLAN" && (
                <>
                  <div className="form-group">
                    <label>Category</label>
                    <div className="type-grid">
                      {["SAVINGS", "DEBT", "PURCHASE", "EMERGENCY"].map((c) => (
                        <div
                          key={c}
                          className={`type-option ${editPlan.category === c ? "selected" : ""}`}
                          onClick={() => setEditPlan(prev => ({ ...prev, category: c }))}
                        >
                          <span className="type-icon">{categoryIcons[c]}</span>
                          <span>{categoryLabels[c]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Target Amount</label>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        value={editPlan.targetAmount}
                        onChange={(e) => setEditPlan(prev => ({ ...prev, targetAmount: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Current Amount</label>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        value={editPlan.currentAmount}
                        onChange={(e) => setEditPlan(prev => ({ ...prev, currentAmount: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Monthly Contribution (optional)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00"
                      value={editPlan.monthlyContribution || ""}
                      onChange={(e) => setEditPlan(prev => ({ ...prev, monthlyContribution: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {editPlan.family === "PRIORITY_PLAN" && (
                <>
                  <div className="form-group">
                    <label>Categories</label>
                    <div className="priority-category-chips">
                      {SPENDING_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          className={`category-chip ${(editPlan.priorityCategoriesParsed || []).includes(cat) ? "selected" : ""}`}
                          onClick={() => {
                            const cats = [...(editPlan.priorityCategoriesParsed || [])]
                            const idx = cats.indexOf(cat)
                            if (idx >= 0) cats.splice(idx, 1)
                            else cats.push(cat)
                            setEditPlan(prev => ({ ...prev, priorityCategoriesParsed: cats }))
                          }}
                        >{cat}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Direction</label>
                      <select
                        value={editPlan.direction || ""}
                        onChange={(e) => setEditPlan(prev => ({ ...prev, direction: e.target.value }))}
                      >
                        <option value="">Select...</option>
                        <option value="INCREASE">Increase</option>
                        <option value="REDUCE">Reduce</option>
                        <option value="PROTECT">Protect</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Intensity</label>
                      <select
                        value={editPlan.intensity || "MEDIUM"}
                        onChange={(e) => setEditPlan(prev => ({ ...prev, intensity: e.target.value }))}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Target Amount (optional)</label>
                      <input
                        type="number" step="0.01" placeholder="e.g. 200"
                        value={editPlan.priorityAmount || ""}
                        onChange={(e) => setEditPlan(prev => ({ ...prev, priorityAmount: e.target.value ? Number(e.target.value) : null }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Reason (optional)</label>
                      <input
                        type="text"
                        value={editPlan.reasonNote || ""}
                        onChange={(e) => setEditPlan(prev => ({ ...prev, reasonNote: e.target.value }))}
                        placeholder="e.g. bulking, exam period..."
                      />
                    </div>
                  </div>
                </>
              )}

              {editPlan.termination === "AFTER_PERIOD" && (
                <div className="form-group">
                  <label>Duration (months)</label>
                  <input
                    type="number" min="1"
                    value={editPlan.durationMonths || ""}
                    onChange={(e) => setEditPlan(prev => ({ ...prev, durationMonths: Number(e.target.value) || null }))}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editPlan.startDate || ""}
                    onChange={(e) => setEditPlan(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                {editPlan.termination === "UNTIL_TARGET" ? (
                  <div className="form-group">
                    <label>Target Date</label>
                    <input
                      type="date"
                      value={editPlan.targetDate || ""}
                      onChange={(e) => setEditPlan(prev => ({ ...prev, targetDate: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={editPlan.endDate || ""}
                      onChange={(e) => setEditPlan(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editPlan.isFlexible !== false}
                    onChange={(e) => setEditPlan(prev => ({ ...prev, isFlexible: e.target.checked }))}
                  />
                  {" "}Flexible (engine can auto-adjust)
                </label>
              </div>

              <div className="form-buttons">
                <button type="button" className="btn-secondary" onClick={() => setEditPlan(null)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={handleEditSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
