import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import { fmt } from "../utils/format"
import "./css/Overview.css"

const API_BASE = "http://localhost:8080/api/expenses"

const getDateString = (daysOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split("T")[0]
}

export default function Overview() {
  const { user } = useAuth()
  const today = getDateString(0)

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.id) {
      setLoading(true)
      axios.get(`${API_BASE}?userId=${user.id}`)
        .then(res => setExpenses(Array.isArray(res.data) ? res.data : []))
        .catch(() => setExpenses([]))
        .finally(() => setLoading(false))
    }
  }, [user?.id])

  const todayTotal = useMemo(() => {
    return expenses.filter(exp => exp.date === today)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [expenses, today])

  const weekTotal = useMemo(() => {
    const weekAgo = getDateString(-7)
    return expenses.filter(exp => exp.date >= weekAgo && exp.date <= today)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [expenses, today])

  const monthTotal = useMemo(() => {
    const monthAgo = getDateString(-30)
    return expenses.filter(exp => exp.date >= monthAgo && exp.date <= today)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [expenses, today])

  const yearTotal = useMemo(() => {
    const yearAgo = getDateString(-365)
    return expenses.filter(exp => exp.date >= yearAgo && exp.date <= today)
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
  }, [expenses, today])

  const categoryBreakdown = useMemo(() => {
    const breakdown = {}
    expenses.filter(exp => exp.date >= getDateString(-30))
      .forEach(exp => {
        const cat = exp.category || "Other"
        breakdown[cat] = (breakdown[cat] || 0) + Number(exp.amount || 0)
      })
    return Object.entries(breakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  const monthlyTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = d.getMonth()
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`
      const total = expenses
        .filter(exp => exp.date && exp.date.startsWith(monthStr))
        .reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
      months.push({ month: monthStr, label: d.toLocaleDateString("en-GB", { month: "short" }), total })
    }
    return months
  }, [expenses])

  const maxMonthlySpend = useMemo(() => {
    return Math.max(...monthlyTrend.map(m => m.total), 1)
  }, [monthlyTrend])

  const categoryIcons = {
    Food: "🍔",
    Travel: "🚗",
    Education: "📚",
    Leisure: "🎮",
    Other: "📦"
  }

  return (
    <div className="overview-page">
      <Navbar />
      <main className="overview-main">
        <div className="overview-header">
          <h1>Overview</h1>
          <p>Your financial snapshot</p>
        </div>

        {loading ? (
          <div className="loading-msg">Loading...</div>
        ) : (
          <>
            <div className="stats-grid four-col">
              <div className="stat-card">
                <div className="stat-label">Today</div>
                <div className="stat-value">£{fmt(todayTotal)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Week</div>
                <div className="stat-value">£{fmt(weekTotal)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Month</div>
                <div className="stat-value">£{fmt(monthTotal)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Year</div>
                <div className="stat-value">£{fmt(yearTotal)}</div>
              </div>
            </div>

            <div className="chart-section">
              <h2>Spending by Category</h2>
              {categoryBreakdown.length > 0 ? (
                <div className="category-bars">
                  {categoryBreakdown.map(item => (
                    <div key={item.category} className="category-bar-item">
                      <div className="bar-label">
                        <span className="bar-icon">{categoryIcons[item.category] || "📦"}</span>
                        {item.category}
                      </div>
                      <div className="bar-container">
                        <div
                          className="bar-fill"
                          style={{ width: `${Math.min((item.amount / monthTotal) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="bar-amount">£{fmt(item.amount)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-text">No expenses this month</p>
              )}
            </div>

            <div className="chart-section">
              <h2>Monthly Trend</h2>
              <div className="trend-chart">
                {monthlyTrend.map(item => (
                  <div key={item.month} className="trend-bar">
                    <div className="trend-value">£{fmt(item.total, 0)}</div>
                    <div className="trend-bar-container">
                      <div
                        className="trend-fill"
                        style={{ height: `${(item.total / maxMonthlySpend) * 100}%` }}
                      />
                    </div>
                    <div className="trend-label">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
