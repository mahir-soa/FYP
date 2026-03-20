import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import Navbar from "../components/Navbar"
import { fmt } from "../utils/format"
import "./css/Overview.css"

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
      api.get(`/expenses?userId=${user.id}`)
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

  const categoryIcon = (cat) => {
    const s = { width: 16, height: 16, flexShrink: 0 }
    switch (cat) {
      case "Food": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
      case "Travel": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h2l2-4h6l2 4h2"/><circle cx="7.5" cy="17" r="2.5"/><circle cx="16.5" cy="17" r="2.5"/></svg>
      case "Education": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
      case "Leisure": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
      default: return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
    }
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
                        <span className="bar-icon">{categoryIcon(item.category)}</span>
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
