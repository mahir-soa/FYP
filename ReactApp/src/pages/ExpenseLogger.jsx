import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import "./css/ExpenseLogger.css"

import foodIcon from "../assets/fast-food.png"
import travelIcon from "../assets/underground.png"
import educationIcon from "../assets/education.png"
import entertainmentIcon from "../assets/cinema.png"
import otherIcon from "../assets/other.png"

const API_BASE = "http://localhost:8080/api/expenses"
const TFL_FARE_API = "http://localhost:8080/api/tfl/fare"

const categories = ["Food", "Travel", "Education", "Leisure", "Other"]
const categoryIcons = {
  Food: foodIcon,
  Travel: travelIcon,
  Education: educationIcon,
  Leisure: entertainmentIcon,
  Other: otherIcon,
}

const zones = [1, 2, 3, 4, 5, 6]

const getDateString = (daysOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split("T")[0]
}

const formatDisplayDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split("T")[0]) return "Today"
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday"

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export default function ExpenseLogger() {
  const today = getDateString(0)
  const { user, logout } = useAuth()

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [date, setDate] = useState(today)
  const [filterDate, setFilterDate] = useState(today)
  const [filterCategory, setFilterCategory] = useState("All")
  const [quickFilter, setQuickFilter] = useState("today")

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [mood, setMood] = useState("")

  const [subType, setSubType] = useState("")
  const [fromZone, setFromZone] = useState("")
  const [toZone, setToZone] = useState("")
  const [isPeak, setIsPeak] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [fareAutoCalculated, setFareAutoCalculated] = useState(false)
  const [calculatingFare, setCalculatingFare] = useState(false)

  const reloadExpenses = async () => {
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await axios.get(API_BASE)
      setExpenses(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setExpenses([])
      setErrorMsg("Could not load expenses.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadExpenses()
  }, [])

  useEffect(() => {
    const fetchTflFare = async () => {
      if (category !== "Travel" || !subType) {
        setFareAutoCalculated(false)
        return
      }

      if (subType === "Bus") {
        setCalculatingFare(true)
        try {
          const res = await axios.get(TFL_FARE_API, { params: { type: "Bus" } })
          setAmount(res.data.fare.toString())
          setFareAutoCalculated(true)
        } catch (err) {
          console.error("Failed to fetch bus fare:", err)
        } finally {
          setCalculatingFare(false)
        }
        return
      }

      if (subType === "Train" && fromZone && toZone) {
        setCalculatingFare(true)
        try {
          const res = await axios.get(TFL_FARE_API, {
            params: {
              type: "Train",
              fromZone: Number(fromZone),
              toZone: Number(toZone),
              isPeak: isPeak
            }
          })
          setAmount(res.data.fare.toString())
          setFareAutoCalculated(true)
        } catch (err) {
          console.error("Failed to fetch train fare:", err)
        } finally {
          setCalculatingFare(false)
        }
      }
    }

    fetchTflFare()
  }, [category, subType, fromZone, toZone, isPeak])

  const resetForm = () => {
    setDate(today)
    setDescription("")
    setAmount("")
    setCategory("")
    setMood("")
    setSubType("")
    setFromZone("")
    setToZone("")
    setIsPeak(true)
    setEditId(null)
    setErrorMsg("")
    setFareAutoCalculated(false)
    setCalculatingFare(false)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const handleQuickFilter = (filter) => {
    setQuickFilter(filter)
    switch (filter) {
      case "today":
        setFilterDate(getDateString(0))
        break
      case "yesterday":
        setFilterDate(getDateString(-1))
        break
      case "week":
        setFilterDate(getDateString(-7))
        break
      default:
        setFilterDate(getDateString(0))
    }
  }

  const filteredExpenses = useMemo(() => {
    if (quickFilter === "week") {
      const weekAgo = getDateString(-7)
      return expenses.filter(
        (exp) =>
          (filterCategory === "All" || exp.category === filterCategory) &&
          exp.date >= weekAgo && exp.date <= today
      )
    }
    return expenses.filter(
      (exp) =>
        (filterCategory === "All" || exp.category === filterCategory) &&
        exp.date === filterDate
    )
  }, [expenses, filterCategory, filterDate, quickFilter, today])

  const totalForPeriod = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [filteredExpenses])

  // Stats calculations
  const todayTotal = useMemo(() => {
    return expenses
      .filter(exp => exp.date === today)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [expenses, today])

  const weekTotal = useMemo(() => {
    const weekAgo = getDateString(-7)
    return expenses
      .filter(exp => exp.date >= weekAgo && exp.date <= today)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [expenses, today])

  const monthTotal = useMemo(() => {
    const monthAgo = getDateString(-30)
    return expenses
      .filter(exp => exp.date >= monthAgo && exp.date <= today)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [expenses, today])

  const buildPayload = () => {
    const base = {
      date,
      description: description || "",
      amount: Number(amount),
      category,
      mood: mood || "",
    }

    if (category !== "Travel") return base

    const travel = {
      subType,
      isPeak: Boolean(isPeak),
    }

    if (subType === "Train") {
      travel.fromZone = fromZone === "" ? null : Number(fromZone)
      travel.toZone = toZone === "" ? null : Number(toZone)
    }

    return { ...base, ...travel }
  }

  const validate = () => {
    if (!category) return "Pick a category."
    if (amount === "" || Number.isNaN(Number(amount))) return "Enter a valid amount."

    if (category === "Travel") {
      if (!subType) return "Select Travel Type."
      if (subType === "Train") {
        if (!fromZone || !toZone) return "Select From Zone and To Zone."
      }
    }

    return ""
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg("")

    const v = validate()
    if (v) {
      setErrorMsg(v)
      return
    }

    const payload = buildPayload()

    try {
      if (editId) {
        await axios.put(`${API_BASE}/${editId}`, payload)
      } else {
        await axios.post(API_BASE, payload)
      }
      await reloadExpenses()
      closeForm()
    } catch (err) {
      setErrorMsg("Save failed. Please try again.")
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    setErrorMsg("")
    try {
      await axios.delete(`${API_BASE}/${id}`)
      await reloadExpenses()
    } catch (err) {
      setErrorMsg("Delete failed.")
      console.error(err)
    }
  }

  const handleEdit = (exp) => {
    setEditId(exp.id)
    setDate(exp.date || today)
    setAmount(exp.amount?.toString?.() || "")
    setDescription(exp.description || "")
    setCategory(exp.category || "")
    setMood(exp.mood || "")
    setSubType(exp.subType || "")
    setFromZone(exp.fromZone?.toString?.() || "")
    setToZone(exp.toZone?.toString?.() || "")
    setIsPeak(exp.isPeak ?? true)
    setShowForm(true)
  }

  return (
    <div className="expense-page">
      <nav className="expense-nav">
        <div className="nav-brand">
          <Link to="/">Expense<span>Tracker</span></Link>
        </div>
        <div className="nav-links">
          <Link to="/chat" className="nav-link chat-btn">
            Financial Assistant
          </Link>
          <span className="nav-user">{user?.name?.split(' ')[0]}</span>
          <button onClick={logout} className="nav-link logout-btn">
            Logout
          </button>
        </div>
      </nav>

      <main className="expense-main">
        <div className="expense-header">
          <h1>Expenses</h1>
          <p>Track and manage your spending</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-label">Today</div>
            <div className="stat-value">£{todayTotal.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">This Week</div>
            <div className="stat-value">£{weekTotal.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">This Month</div>
            <div className="stat-value">£{monthTotal.toFixed(2)}</div>
          </div>
        </div>

        <div className="expense-controls">
          <div className="filter-group">
            <div className="quick-filters">
              <button
                className={`quick-filter-btn ${quickFilter === "today" ? "active" : ""}`}
                onClick={() => handleQuickFilter("today")}
              >
                Today
              </button>
              <button
                className={`quick-filter-btn ${quickFilter === "yesterday" ? "active" : ""}`}
                onClick={() => handleQuickFilter("yesterday")}
              >
                Yesterday
              </button>
              <button
                className={`quick-filter-btn ${quickFilter === "week" ? "active" : ""}`}
                onClick={() => handleQuickFilter("week")}
              >
                Past 7 Days
              </button>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Expense
          </button>
        </div>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        {loading ? (
          <div className="loading-msg">
            <div className="loading-spinner"></div>
            Loading expenses...
          </div>
        ) : filteredExpenses.length > 0 ? (
          <>
            <div className="section-header">
              <h2 className="section-title">
                {quickFilter === "week" ? "Past 7 Days" : formatDisplayDate(filterDate)}
              </h2>
              <span className="expense-count">
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""} · £{totalForPeriod.toFixed(2)}
              </span>
            </div>
            <div className="expense-list">
              {filteredExpenses.map((exp) => (
                <div key={exp.id} className="expense-card">
                  <div className="expense-icon">
                    <img src={categoryIcons[exp.category] || otherIcon} alt={exp.category} />
                  </div>
                  <div className="expense-details">
                    <div className="expense-top">
                      <span className={`expense-category cat-${exp.category?.toLowerCase()}`}>
                        {exp.category}
                      </span>
                    </div>
                    {exp.description && <p className="expense-desc">{exp.description}</p>}
                    {exp.category === "Travel" && exp.subType && (
                      <p className="expense-travel">
                        {exp.subType}
                        {exp.subType === "Train" && exp.fromZone && exp.toZone
                          ? ` · Zone ${exp.fromZone} → ${exp.toZone} · ${exp.isPeak ? "Peak" : "Off-Peak"}`
                          : ""}
                      </p>
                    )}
                    {exp.mood && <p className="expense-mood">{exp.mood}</p>}
                  </div>
                  <span className="expense-amount">£{Number(exp.amount || 0).toFixed(2)}</span>
                  <div className="expense-actions">
                    <button className="action-btn edit" onClick={() => handleEdit(exp)}>Edit</button>
                    <button className="action-btn delete" onClick={() => handleDelete(exp.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <h3>No expenses recorded</h3>
            <p>Start tracking your spending by adding your first expense</p>
            <button className="add-btn" onClick={() => setShowForm(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Expense
            </button>
          </div>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Expense" : "New Expense"}</h2>
              <button className="modal-close" onClick={closeForm}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="category-grid">
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className={`category-option ${category === cat ? "selected" : ""}`}
                      onClick={() => {
                        setCategory(cat)
                        setSubType("")
                        setFromZone("")
                        setToZone("")
                        setIsPeak(true)
                      }}
                    >
                      <img src={categoryIcons[cat]} alt={cat} />
                      <span>{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {category === "Travel" && (
                <div className="travel-options">
                  <div className="form-group">
                    <label>Travel Type</label>
                    <select value={subType} onChange={(e) => setSubType(e.target.value)} required>
                      <option value="">Select type</option>
                      <option value="Bus">Bus</option>
                      <option value="Train">Train</option>
                    </select>
                  </div>

                  {subType === "Train" && (
                    <>
                      <div className="form-group">
                        <label>Time</label>
                        <select value={isPeak ? "Peak" : "Off-Peak"} onChange={(e) => setIsPeak(e.target.value === "Peak")}>
                          <option value="Peak">Peak</option>
                          <option value="Off-Peak">Off-Peak</option>
                        </select>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>From Zone</label>
                          <select value={fromZone} onChange={(e) => setFromZone(e.target.value)} required>
                            <option value="">Select</option>
                            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>To Zone</label>
                          <select value={toZone} onChange={(e) => setToZone(e.target.value)} required>
                            <option value="">Select</option>
                            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setFareAutoCalculated(false)
                  }}
                  required
                />
                {calculatingFare && <span className="fare-hint">Calculating TfL fare...</span>}
                {fareAutoCalculated && !calculatingFare && <span className="fare-hint success">TfL fare applied</span>}
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  placeholder="What was this for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Mood (optional)</label>
                <input
                  type="text"
                  placeholder="How did you feel about this?"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
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
