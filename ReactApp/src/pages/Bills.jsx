import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import Navbar from "../components/Navbar"
import { fmt } from "../utils/format"
import "./css/Bills.css"

const frequencies = ["MONTHLY", "QUARTERLY", "YEARLY"]
const BillIcon = ({ type, size = 16 }) => {
  const s = { width: size, height: size }
  switch (type) {
    case "RENT": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case "ELECTRICITY": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    case "WATER": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>
    case "GAS": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>
    case "INTERNET": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
    case "PHONE": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
    case "INSURANCE": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    case "COUNCIL_TAX": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    default: return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  }
}

const categories = [
  { value: "RENT", label: "Rent/Mortgage" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "WATER", label: "Water" },
  { value: "GAS", label: "Gas" },
  { value: "INTERNET", label: "Internet" },
  { value: "PHONE", label: "Phone" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "COUNCIL_TAX", label: "Council Tax" },
  { value: "OTHER", label: "Other" }
]

const getCategoryInfo = (categoryValue) => {
  return categories.find(c => c.value === categoryValue) || { label: categoryValue }
}

const getCurrentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const formatFrequency = (freq) => {
  switch (freq) {
    case "MONTHLY": return "Monthly"
    case "QUARTERLY": return "Quarterly"
    case "YEARLY": return "Yearly"
    default: return freq
  }
}

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) return "th"
  switch (day % 10) {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
  }
}

export default function Bills() {
  const { user } = useAuth()
  const currentMonth = getCurrentMonth()
  const today = new Date().getDate()

  const [bills, setBills] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    dueDay: 1,
    frequency: "MONTHLY",
    category: "OTHER",
    notes: ""
  })

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    setErrorMsg("")

    try {
      const [billsRes, summaryRes] = await Promise.all([
        api.get(`/bills?userId=${user.id}`),
        api.get(`/bills/summary?userId=${user.id}`)
      ])
      setBills(Array.isArray(billsRes.data) ? billsRes.data : [])
      setSummary(summaryRes.data)
    } catch (err) {
      setErrorMsg("Could not load bills.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) loadData()
  }, [user?.id])

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      dueDay: 1,
      frequency: "MONTHLY",
      category: "OTHER",
      notes: ""
    })
    setEditId(null)
  }

  const openForm = (bill = null) => {
    if (bill) {
      setFormData({
        name: bill.name || "",
        amount: bill.amount || "",
        dueDay: bill.dueDay || 1,
        frequency: bill.frequency || "MONTHLY",
        category: bill.category || "OTHER",
        notes: bill.notes || ""
      })
      setEditId(bill.id)
    } else {
      resetForm()
    }
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg("")

    const payload = {
      name: formData.name.trim(),
      amount: parseFloat(formData.amount) || 0,
      dueDay: parseInt(formData.dueDay) || 1,
      frequency: formData.frequency,
      category: formData.category,
      notes: formData.notes.trim()
    }

    if (!payload.name || payload.amount <= 0) {
      setErrorMsg("Please enter a valid name and amount.")
      return
    }

    try {
      if (editId) {
        await api.put(`/bills/${editId}?userId=${user.id}`, payload)
      } else {
        await api.post(`/bills?userId=${user.id}`, payload)
      }
      closeForm()
      loadData()
    } catch (err) {
      setErrorMsg("Failed to save bill.")
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bill?")) return
    try {
      await api.delete(`/bills/${id}?userId=${user.id}`)
      loadData()
    } catch (err) {
      setErrorMsg("Failed to delete bill.")
    }
  }

  const handleMarkPaid = async (id, isPaid) => {
    try {
      if (isPaid) {
        await api.patch(`/bills/${id}/unpay?userId=${user.id}`)
      } else {
        await api.patch(`/bills/${id}/pay?userId=${user.id}`)
      }
      loadData()
    } catch (err) {
      setErrorMsg("Failed to update bill status.")
    }
  }

  const { unpaidBills, paidBills } = useMemo(() => {
    const unpaid = bills.filter(b => b.lastPaidMonth !== currentMonth)
    const paid = bills.filter(b => b.lastPaidMonth === currentMonth)
    return { unpaidBills: unpaid, paidBills: paid }
  }, [bills, currentMonth])

  const getBillStatus = (bill) => {
    if (bill.lastPaidMonth === currentMonth) return "paid"
    if (bill.dueDay < today) return "overdue"
    if (bill.dueDay <= today + 3) return "due-soon"
    return "upcoming"
  }

  return (
    <div className="bills-page">
      <Navbar />
      <main className="bills-main">
        <div className="bills-header">
          <div>
            <h1>Bills & Utilities</h1>
            <p>Track your recurring bills and never miss a payment</p>
          </div>
          <button className="add-bill-btn" onClick={() => openForm()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Add Bill
          </button>
        </div>

        {loading ? (
          <div className="loading-msg">Loading bills...</div>
        ) : (
          <>
            
            {summary && (
              <div className="summary-grid">
                <div className="summary-card total">
                  <div className="summary-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
                  <div className="summary-content">
                    <span className="summary-label">Monthly Bills</span>
                    <span className="summary-value">£{fmt(summary.totalMonthlyBills)}</span>
                  </div>
                </div>
                <div className="summary-card paid">
                  <div className="summary-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                  <div className="summary-content">
                    <span className="summary-label">Paid This Month</span>
                    <span className="summary-value">£{fmt(summary.paidThisMonth)}</span>
                    <span className="summary-count">{summary.paidCount} of {summary.totalBills} bills</span>
                  </div>
                </div>
                <div className="summary-card unpaid">
                  <div className="summary-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                  <div className="summary-content">
                    <span className="summary-label">Remaining</span>
                    <span className="summary-value">£{fmt(summary.unpaidThisMonth)}</span>
                    <span className="summary-count">{summary.unpaidCount} bills left</span>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            
            {unpaidBills.length > 0 && (
              <div className="bills-section">
                <h2>Due This Month</h2>
                <div className="bills-list">
                  {unpaidBills.map(bill => {
                    const catInfo = getCategoryInfo(bill.category)
                    const status = getBillStatus(bill)
                    return (
                      <div key={bill.id} className={`bill-card ${status}`}>
                        <div className="bill-icon">{<BillIcon type={catInfo.value || "OTHER"} />}</div>
                        <div className="bill-info">
                          <div className="bill-name">{bill.name}</div>
                          <div className="bill-meta">
                            <span className="bill-category">{catInfo.label}</span>
                            <span className="bill-dot">•</span>
                            <span className="bill-due">
                              Due {bill.dueDay}{getOrdinalSuffix(bill.dueDay)}
                            </span>
                            <span className="bill-dot">•</span>
                            <span className="bill-freq">{formatFrequency(bill.frequency)}</span>
                          </div>
                        </div>
                        <div className="bill-amount">£{fmt(bill.amount)}</div>
                        <div className={`bill-status-badge ${status}`}>
                          {status === "overdue" ? "Overdue" : status === "due-soon" ? "Due Soon" : "Upcoming"}
                        </div>
                        <div className="bill-actions">
                          <button
                            className="mark-paid-btn"
                            onClick={() => handleMarkPaid(bill.id, false)}
                            title="Mark as paid"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </button>
                          <button className="edit-btn" onClick={() => openForm(bill)} title="Edit">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="delete-btn" onClick={() => handleDelete(bill.id)} title="Delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            
            {paidBills.length > 0 && (
              <div className="bills-section paid-section">
                <h2>Paid This Month</h2>
                <div className="bills-list">
                  {paidBills.map(bill => {
                    const catInfo = getCategoryInfo(bill.category)
                    return (
                      <div key={bill.id} className="bill-card paid">
                        <div className="bill-icon">{<BillIcon type={catInfo.value || "OTHER"} />}</div>
                        <div className="bill-info">
                          <div className="bill-name">{bill.name}</div>
                          <div className="bill-meta">
                            <span className="bill-category">{catInfo.label}</span>
                            <span className="bill-dot">•</span>
                            <span className="bill-paid-date">Paid {bill.paidDate}</span>
                          </div>
                        </div>
                        <div className="bill-amount">£{fmt(bill.amount)}</div>
                        <div className="bill-status-badge paid">Paid</div>
                        <div className="bill-actions">
                          <button
                            className="undo-btn"
                            onClick={() => handleMarkPaid(bill.id, true)}
                            title="Mark as unpaid"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                              <path d="M3 3v5h5" />
                            </svg>
                          </button>
                          <button className="edit-btn" onClick={() => openForm(bill)} title="Edit">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="delete-btn" onClick={() => handleDelete(bill.id)} title="Delete">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            
            {bills.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
                <h3>No bills added yet</h3>
                <p>Add your recurring bills to track payments and include them in your budget.</p>
                <button className="add-first-btn" onClick={() => openForm()}>Add Your First Bill</button>
              </div>
            )}
          </>
        )}

        
        {showForm && (
          <div className="modal-overlay" onClick={closeForm}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editId ? "Edit Bill" : "Add Bill"}</h2>
                <button className="modal-close" onClick={closeForm}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Bill Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Electricity Bill"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Amount (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Day</label>
                    <select
                      value={formData.dueDay}
                      onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}{getOrdinalSuffix(day)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    >
                      {frequencies.map(freq => (
                        <option key={freq} value={freq}>{formatFrequency(freq)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={closeForm}>Cancel</button>
                  <button type="submit" className="submit-btn">
                    {editId ? "Save Changes" : "Add Bill"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
