import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import "./css/Bills.css"

const API_BASE = "http://localhost:8080/api/bills"

const frequencies = ["MONTHLY", "QUARTERLY", "YEARLY"]
const categories = [
  { value: "RENT", label: "Rent/Mortgage", icon: "🏠" },
  { value: "ELECTRICITY", label: "Electricity", icon: "⚡" },
  { value: "WATER", label: "Water", icon: "💧" },
  { value: "GAS", label: "Gas", icon: "🔥" },
  { value: "INTERNET", label: "Internet", icon: "📶" },
  { value: "PHONE", label: "Phone", icon: "📱" },
  { value: "INSURANCE", label: "Insurance", icon: "🛡️" },
  { value: "COUNCIL_TAX", label: "Council Tax", icon: "🏛️" },
  { value: "OTHER", label: "Other", icon: "📄" }
]

const getCategoryInfo = (categoryValue) => {
  return categories.find(c => c.value === categoryValue) || { label: categoryValue, icon: "📄" }
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
        axios.get(`${API_BASE}?userId=${user.id}`),
        axios.get(`${API_BASE}/summary?userId=${user.id}`)
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
        await axios.put(`${API_BASE}/${editId}?userId=${user.id}`, payload)
      } else {
        await axios.post(`${API_BASE}?userId=${user.id}`, payload)
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
      await axios.delete(`${API_BASE}/${id}?userId=${user.id}`)
      loadData()
    } catch (err) {
      setErrorMsg("Failed to delete bill.")
    }
  }

  const handleMarkPaid = async (id, isPaid) => {
    try {
      if (isPaid) {
        await axios.patch(`${API_BASE}/${id}/unpay?userId=${user.id}`)
      } else {
        await axios.patch(`${API_BASE}/${id}/pay?userId=${user.id}`)
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
            {/* Summary Cards */}
            {summary && (
              <div className="summary-grid">
                <div className="summary-card total">
                  <div className="summary-icon">📋</div>
                  <div className="summary-content">
                    <span className="summary-label">Monthly Bills</span>
                    <span className="summary-value">£{summary.totalMonthlyBills?.toFixed(2)}</span>
                  </div>
                </div>
                <div className="summary-card paid">
                  <div className="summary-icon">✅</div>
                  <div className="summary-content">
                    <span className="summary-label">Paid This Month</span>
                    <span className="summary-value">£{summary.paidThisMonth?.toFixed(2)}</span>
                    <span className="summary-count">{summary.paidCount} of {summary.totalBills} bills</span>
                  </div>
                </div>
                <div className="summary-card unpaid">
                  <div className="summary-icon">⏳</div>
                  <div className="summary-content">
                    <span className="summary-label">Remaining</span>
                    <span className="summary-value">£{summary.unpaidThisMonth?.toFixed(2)}</span>
                    <span className="summary-count">{summary.unpaidCount} bills left</span>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            {/* Unpaid Bills */}
            {unpaidBills.length > 0 && (
              <div className="bills-section">
                <h2>Due This Month</h2>
                <div className="bills-list">
                  {unpaidBills.map(bill => {
                    const catInfo = getCategoryInfo(bill.category)
                    const status = getBillStatus(bill)
                    return (
                      <div key={bill.id} className={`bill-card ${status}`}>
                        <div className="bill-icon">{catInfo.icon}</div>
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
                        <div className="bill-amount">£{bill.amount.toFixed(2)}</div>
                        <div className={`bill-status-badge ${status}`}>
                          {status === "overdue" ? "Overdue" : status === "due-soon" ? "Due Soon" : "Upcoming"}
                        </div>
                        <div className="bill-actions">
                          <button
                            className="mark-paid-btn"
                            onClick={() => handleMarkPaid(bill.id, false)}
                            title="Mark as paid"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </button>
                          <button className="edit-btn" onClick={() => openForm(bill)} title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="delete-btn" onClick={() => handleDelete(bill.id)} title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

            {/* Paid Bills */}
            {paidBills.length > 0 && (
              <div className="bills-section paid-section">
                <h2>Paid This Month</h2>
                <div className="bills-list">
                  {paidBills.map(bill => {
                    const catInfo = getCategoryInfo(bill.category)
                    return (
                      <div key={bill.id} className="bill-card paid">
                        <div className="bill-icon">{catInfo.icon}</div>
                        <div className="bill-info">
                          <div className="bill-name">{bill.name}</div>
                          <div className="bill-meta">
                            <span className="bill-category">{catInfo.label}</span>
                            <span className="bill-dot">•</span>
                            <span className="bill-paid-date">Paid {bill.paidDate}</span>
                          </div>
                        </div>
                        <div className="bill-amount">£{bill.amount.toFixed(2)}</div>
                        <div className="bill-status-badge paid">Paid</div>
                        <div className="bill-actions">
                          <button
                            className="undo-btn"
                            onClick={() => handleMarkPaid(bill.id, true)}
                            title="Mark as unpaid"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                              <path d="M3 3v5h5" />
                            </svg>
                          </button>
                          <button className="edit-btn" onClick={() => openForm(bill)} title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="delete-btn" onClick={() => handleDelete(bill.id)} title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

            {/* Empty State */}
            {bills.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🧾</div>
                <h3>No bills added yet</h3>
                <p>Add your recurring bills to track payments and include them in your budget.</p>
                <button className="add-first-btn" onClick={() => openForm()}>Add Your First Bill</button>
              </div>
            )}
          </>
        )}

        {/* Form Modal */}
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
                        <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
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
