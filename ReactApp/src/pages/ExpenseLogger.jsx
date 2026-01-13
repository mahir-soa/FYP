import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import "./css/ExpenseLogger.css"

import foodIcon from "../assets/fast-food.png"
import travelIcon from "../assets/underground.png"
import educationIcon from "../assets/education.png"
import entertainmentIcon from "../assets/cinema.png"
import otherIcon from "../assets/other.png"

const HEALTH_URL = "http://localhost:8080/api/health"
const API_BASE = "http://localhost:8080/api/expenses"

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

  useEffect(() => {
    axios
      .get(HEALTH_URL)
      .then((res) => setBackendStatus(String(res.data)))
      .catch(() => setBackendStatus("offline"))
  }, [])

  useEffect(() => {
    axios
      .get(API_BASE)
      .then((res) => setExpenses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setExpenses([]))
  }, [])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (amount === "" || category === "") return

    const payload = {
      date,
      description,
      amount: parseFloat(amount),
      category,
      mood,
      subType,
      fromZone,
      toZone,
      isPeak,
    }

    try {
      if (editId) {
        const res = await axios.put(`${API_BASE}/${editId}`, payload)
        const updated = res.data?.id ? res.data : { id: editId, ...payload }
        setExpenses((prev) => prev.map((x) => (x.id === editId ? updated : x)))
      } else {
        const res = await axios.post(API_BASE, payload)
        const created = res.data?.id ? res.data : { id: Date.now(), ...payload }
        setExpenses((prev) => [created, ...prev])
      }
      closeForm()
    } catch (err) {}
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`)
      setExpenses((prev) => prev.filter((x) => x.id !== id))
    } catch (err) {}
  }

  return (
    <div className="daily-tracker">
      <h2>
        Daily spending journal{" "}
        <span style={{ fontSize: "14px", fontWeight: "normal" }}>
          Backend: {backendStatus}
        </span>
      </h2>

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
          {showForm ? "Cancel" : editId ? "Cancel Edit" : "Add Expense"}
        </button>
      </div>

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
                    className={`category-icon-card ${
                      category === cat ? "active" : ""
                    }`}
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

              <input
                type="number"
                placeholder="Amount (£)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

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
                <span
                  className={`category-badge ${getCategoryBadgeClass(
                    exp.category
                  )}`}
                >
                  {exp.category}
                </span>

                <p>£{Number(exp.amount || 0).toFixed(2)}</p>

                {exp.description && <p>{exp.description}</p>}
                {exp.mood && <p>{exp.mood}</p>}

                {exp.category === "Travel" && exp.subType && (
                  <p>
                    {exp.subType}
                    {exp.subType === "Train" && exp.fromZone && exp.toZone
                      ? ` • Zone ${exp.fromZone} → ${exp.toZone} • ${
                          exp.isPeak ? "Peak" : "Off-Peak"
                        }`
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
                    setFromZone(exp.fromZone || "")
                    setToZone(exp.toZone || "")
                    setIsPeak(exp.isPeak ?? true)
                    setShowForm(true)
                  }}
                >
                  Edit
                </button>

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(exp.id)}
                >
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
