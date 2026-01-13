import React, { useState, useEffect } from "react"
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
  Other: otherIcon
}

const ExpenseLogger = () => {
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

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    axios
      .get(HEALTH_URL)
      .then((res) => setBackendStatus(res.data))
      .catch(() => setBackendStatus("offline"))
  }, [])

  useEffect(() => {
    axios
      .get(API_BASE)
      .then((res) => setExpenses(res.data))
      .catch(() => {
        setExpenses([
          {
            id: 1,
            date: today,
            description: "Takeaway",
            amount: 12.5,
            category: "Food",
            mood: "Tired"
          },
          {
            id: 2,
            date: today,
            description: "Tube",
            amount: 3.6,
            category: "Travel",
            mood: ""
          }
        ])
      })
  }, [today])

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setCategory("")
    setMood("")
    setDate(today)
    setEditId(null)
    setShowForm(false)
  }

  const closeForm = () => resetForm()

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (amount === "" || category === "") return

    const payload = {
      date,
      description,
      amount: parseFloat(amount),
      category,
      mood
    }

    try {
      if (editId) {
        const res = await axios.put(`${API_BASE}/${editId}`, payload)
        const updated = res?.data ? res.data : { id: editId, ...payload }
        setExpenses(expenses.map((exp) => (exp.id === editId ? updated : exp)))
      } else {
        const res = await axios.post(API_BASE, payload)
        const created = res?.data ? res.data : { id: Date.now(), ...payload }
        setExpenses([created, ...expenses])
      }
      resetForm()
    } catch {
      if (editId) {
        setExpenses(expenses.map((exp) => (exp.id === editId ? { id: editId, ...payload } : exp)))
      } else {
        setExpenses([{ id: Date.now(), ...payload }, ...expenses])
      }
      resetForm()
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`)
      setExpenses(expenses.filter((exp) => exp.id !== id))
    } catch {
      setExpenses(expenses.filter((exp) => exp.id !== id))
    }
  }

  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
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

  const filteredExpenses = expenses.filter(
    (exp) =>
      (filterCategory === "All" || exp.category === filterCategory) &&
      exp.date === filterDate
  )

  return (
    <div className="daily-tracker">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h2>Daily spending journal</h2>
        <div style={{ opacity: 0.8 }}>
          Backend: <strong>{backendStatus}</strong>
        </div>
      </div>

      <div className="filter-bar">
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option>All</option>
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <button onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? "Cancel" : editId ? "Cancel Edit" : "Add Expense"}
        </button>
      </div>

      {filteredExpenses.length > 0 && (
        <div className="daily-total">
          Total for {filterDate}:{" "}
          <strong>
            £{filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
          </strong>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "Edit Expense" : "Add New Expense"}</h3>

            <form onSubmit={handleAddExpense}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

              <div className="category-icon-group">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className={`category-icon-card ${category === cat ? "active" : ""}`}
                    onClick={() => setCategory(cat)}
                  >
                    <img src={categoryIcons[cat]} alt={cat} className="category-icon-img" />
                    <span>{cat}</span>
                  </div>
                ))}
              </div>

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
                <span className={`category-badge ${getCategoryBadgeClass(exp.category)}`}>
                  {exp.category}
                </span>
                <p>£{exp.amount.toFixed(2)}</p>
                {exp.description && <p>{exp.description}</p>}
                {exp.mood && <p>Mood: {exp.mood}</p>}
              </div>

              <div className="expense-buttons">
                <button
                  className="edit-btn"
                  onClick={() => {
                    setEditId(exp.id)
                    setDate(exp.date)
                    setAmount(exp.amount.toString())
                    setDescription(exp.description || "")
                    setCategory(exp.category)
                    setMood(exp.mood || "")
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

export default ExpenseLogger
