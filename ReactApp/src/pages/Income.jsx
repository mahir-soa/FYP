import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import "./css/Income.css"

const API_BASE = "http://localhost:8080/api/incomes"

const frequencies = ["ONE_TIME", "WEEKLY", "MONTHLY", "YEARLY"]

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

export default function Income() {
  const today = getDateString(0)
  const { user } = useAuth()

  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [frequency, setFrequency] = useState("MONTHLY")

  const reloadIncomes = async () => {
    if (!user?.id) return
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await axios.get(`${API_BASE}?userId=${user.id}`)
      setIncomes(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setIncomes([])
      setErrorMsg("Could not load incomes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) reloadIncomes()
  }, [user?.id])

  const totalMonthly = useMemo(() => {
    return incomes.reduce((sum, inc) => {
      if (inc.frequency === "MONTHLY") return sum + inc.amount
      if (inc.frequency === "YEARLY") return sum + (inc.amount / 12)
      if (inc.frequency === "WEEKLY") return sum + (inc.amount * 4.33)
      return sum
    }, 0)
  }, [incomes])

  const totalYearly = useMemo(() => {
    return incomes.reduce((sum, inc) => {
      if (inc.frequency === "YEARLY") return sum + inc.amount
      if (inc.frequency === "MONTHLY") return sum + (inc.amount * 12)
      if (inc.frequency === "WEEKLY") return sum + (inc.amount * 52)
      return sum
    }, 0)
  }, [incomes])

  const resetForm = () => {
    setSource("")
    setAmount("")
    setDate(today)
    setFrequency("MONTHLY")
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

    if (!source.trim()) {
      setErrorMsg("Source is required.")
      return
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMsg("Enter a valid amount.")
      return
    }

    const payload = { source: source.trim(), amount: Number(amount), date, frequency }

    try {
      if (editId) {
        await axios.put(`${API_BASE}/${editId}?userId=${user.id}`, payload)
      } else {
        await axios.post(`${API_BASE}?userId=${user.id}`, payload)
      }
      await reloadIncomes()
      closeForm()
    } catch (err) {
      setErrorMsg("Save failed. Please try again.")
    }
  }

  const handleDelete = async (id) => {
    setErrorMsg("")
    try {
      await axios.delete(`${API_BASE}/${id}?userId=${user.id}`)
      await reloadIncomes()
    } catch (err) {
      setErrorMsg("Delete failed.")
    }
  }

  const handleEdit = (inc) => {
    setEditId(inc.id)
    setSource(inc.source || "")
    setAmount(inc.amount?.toString() || "")
    setDate(inc.date || today)
    setFrequency(inc.frequency || "MONTHLY")
    setShowForm(true)
  }

  const frequencyLabels = {
    ONE_TIME: "One-time",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    YEARLY: "Yearly"
  }

  return (
    <div className="income-page">
      <Navbar />
      <main className="income-main">
        <div className="income-header">
          <h1>Income</h1>
          <p>Track your income sources</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Monthly Income</div>
            <div className="stat-value income">£{totalMonthly.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Yearly Income</div>
            <div className="stat-value income">£{totalYearly.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sources</div>
            <div className="stat-value">{incomes.length}</div>
          </div>
        </div>

        <div className="income-controls">
          <button className="add-btn" onClick={() => setShowForm(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Income
          </button>
        </div>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        {loading ? (
          <div className="loading-msg">Loading incomes...</div>
        ) : incomes.length > 0 ? (
          <div className="income-list">
            {incomes.map((inc) => (
              <div key={inc.id} className="income-card">
                <div className="income-icon">💰</div>
                <div className="income-details">
                  <div className="income-source">{inc.source}</div>
                  <div className="income-meta">
                    <span className="income-frequency">{frequencyLabels[inc.frequency] || inc.frequency}</span>
                    {inc.date && <span className="income-date">{formatDisplayDate(inc.date)}</span>}
                  </div>
                </div>
                <div className="income-amount">£{inc.amount.toFixed(2)}</div>
                <div className="income-actions">
                  <button className="action-btn edit" onClick={() => handleEdit(inc)}>Edit</button>
                  <button className="action-btn delete" onClick={() => handleDelete(inc.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>No income tracked</h3>
            <p>Add your income sources to track your earnings</p>
            <button className="add-btn" onClick={() => setShowForm(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Income
            </button>
          </div>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Income" : "New Income"}</h2>
              <button className="modal-close" onClick={closeForm}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="income-form">
              <div className="form-group">
                <label>Source</label>
                <input
                  type="text"
                  placeholder="e.g., Salary, Freelance, Investment"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                    {frequencies.map((f) => (
                      <option key={f} value={f}>{frequencyLabels[f]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
