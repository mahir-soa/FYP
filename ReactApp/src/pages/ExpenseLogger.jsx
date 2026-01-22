import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import "./css/ExpenseLogger.css"

import foodIcon from "../assets/fast-food.png"
import travelIcon from "../assets/underground.png"
import educationIcon from "../assets/education.png"
import entertainmentIcon from "../assets/cinema.png"
import otherIcon from "../assets/other.png"

const HEALTH_URL = "http://localhost:8080/api/health"
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

export default function ExpenseLogger() {
  const today = new Date().toISOString().split("T")[0]

  const [backendStatus, setBackendStatus] = useState("checking...")
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [date, setDate] = useState(today)
  const [filterDate, setFilterDate] = useState(today)
  const [filterCategory, setFilterCategory] = useState("All")

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
      setErrorMsg("Could not load expenses from the backend.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    axios
      .get(HEALTH_URL)
      .then((res) => setBackendStatus(typeof res.data === "string" ? res.data : "online"))
      .catch(() => setBackendStatus("offline"))
  }, [])

  useEffect(() => {
    reloadExpenses()
  }, [])

  // Auto-calculate TfL fare when travel details change
  useEffect(() => {
    const fetchTflFare = async () => {
      if (category !== "Travel" || !subType) {
        setFareAutoCalculated(false)
        return
      }

      // For Bus, we can calculate immediately
      if (subType === "Bus") {
        setCalculatingFare(true)
        try {
          const res = await axios.get(TFL_FARE_API, {
            params: { type: "Bus" }
          })
          setAmount(res.data.fare.toString())
          setFareAutoCalculated(true)
        } catch (err) {
          console.error("Failed to fetch bus fare:", err)
        } finally {
          setCalculatingFare(false)
        }
        return
      }

      // For Train, we need zones
      if (subType === "Train" && fromZone && toZone && fromZone !== toZone) {
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

  const getCategoryBadgeClass = (c) => {
    switch (c) {
      case "Food":
        return "category-food"
      case "Travel":
        return "category-travel"
      case "Education":
        return "category-education"
      case "Leisure":
        return "category-entertainment"
      default:
        return "category-other"
    }
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (exp) =>
        (filterCategory === "All" || exp.category === filterCategory) &&
        exp.date === filterDate
    )
  }, [expenses, filterCategory, filterDate])

  const totalForDay = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [filteredExpenses])

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
        if (fromZone === toZone) return "From Zone and To Zone can’t be the same."
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
      setErrorMsg("Save failed. Check backend logs / CORS / validation.")
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

  return (
    <div className="daily-tracker">
      <div className="header-row">
        <h2>
          Daily spending journal{" "}
          <span style={{ fontSize: "14px", fontWeight: "normal" }}>
            Backend: {backendStatus}
          </span>
        </h2>
        <Link to="/chat" className="chat-link">
          💬 Financial Assistant
        </Link>
      </div>

      <div className="filter-bar">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="All">All</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            if (showForm) {
              closeForm()
              return
            }
            setShowForm(true)
          }}
        >
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {loading && <div className="loading-banner">Loading…</div>}

      {filteredExpenses.length > 0 && (
        <div className="daily-total">
          Total for {filterDate}: <strong>£{totalForDay.toFixed(2)}</strong>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "Edit Expense" : "Add New Expense"}</h3>

            <form onSubmit={handleSubmit}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <div className="category-icon-group">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className={`category-icon-card ${category === cat ? "active" : ""}`}
                    onClick={() => {
                      setCategory(cat)
                      setSubType("")
                      setFromZone("")
                      setToZone("")
                      setIsPeak(true)
                    }}
                  >
                    <img
                      src={categoryIcons[cat]}
                      alt={cat}
                      className="category-icon-img"
                    />
                    <span>{cat}</span>
                  </div>
                ))}
              </div>

              {category === "Travel" && (
                <>
                  <select
                    className="travel-type-select"
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    required
                  >
                    <option value="">Select Travel Type</option>
                    <option value="Bus">Bus</option>
                    <option value="Train">Train</option>
                  </select>

                  {subType === "Train" && (
                    <>
                      <select
                        className="peak-toggle"
                        value={isPeak ? "Peak" : "Off-Peak"}
                        onChange={(e) => setIsPeak(e.target.value === "Peak")}
                      >
                        <option value="Peak">Peak</option>
                        <option value="Off-Peak">Off-Peak</option>
                      </select>

                      <div className="zone-pickers">
                        <select
                          value={fromZone}
                          onChange={(e) => setFromZone(e.target.value)}
                          required
                        >
                          <option value="">From Zone</option>
                          {zones.map((z) => (
                            <option key={z} value={z}>
                              {z}
                            </option>
                          ))}
                        </select>

                        <select
                          value={toZone}
                          onChange={(e) => setToZone(e.target.value)}
                          required
                        >
                          <option value="">To Zone</option>
                          {zones.map((z) => (
                            <option key={z} value={z}>
                              {z}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <input
                type="text"
                placeholder="Mood (optional)"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              />

              <div className="amount-input-wrapper">
                <input
                  type="number"
                  placeholder="Amount (£)"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setFareAutoCalculated(false)
                  }}
                  required
                />
                {calculatingFare && <span className="fare-status">Calculating...</span>}
                {fareAutoCalculated && !calculatingFare && (
                  <span className="fare-status fare-auto">TfL fare auto-applied</span>
                )}
              </div>

              <button type="submit">{editId ? "Update" : "Save"}</button>
              <button type="button" onClick={closeForm}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {filteredExpenses.length > 0 ? (
        <div className="expense-cards">
          {filteredExpenses.map((exp) => (
            <div key={exp.id} className="expense-card">
              <div className="expense-info">
                <span className={`category-badge ${getCategoryBadgeClass(exp.category)}`}>
                  {exp.category}
                </span>

                <p>£{Number(exp.amount || 0).toFixed(2)}</p>

                {exp.description && <p>{exp.description}</p>}
                {exp.mood && <p>{exp.mood}</p>}

                {exp.category === "Travel" && exp.subType && (
                  <p>
                    {exp.subType}
                    {exp.subType === "Train" && exp.fromZone && exp.toZone
                      ? ` • Zone ${exp.fromZone} → ${exp.toZone} • ${exp.isPeak ? "Peak" : "Off-Peak"}`
                      : ""}
                  </p>
                )}
              </div>

              <div className="expense-buttons">
                <button
                  className="edit-btn"
                  onClick={() => {
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
                  }}
                >
                  Edit
                </button>

                <button className="delete-btn" onClick={() => handleDelete(exp.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-expenses">No expenses match this filter.</p>
      )}
    </div>
  )
}
