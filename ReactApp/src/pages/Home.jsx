import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import budgetBot from "../assets/budget-bot.png"
import "./css/Home.css"

const API_BASE = "http://localhost:8080/api"

function LandingPage() {
  return (
    <div className="landing">
      {/* Hero - Budget Focused with Visual */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Smart Budget Planning
          </div>
          <h1 className="hero-title">
            Budget smarter,<br />
            <span className="gradient-text">spend better</span>
          </h1>
          <p className="hero-subtitle">
            Set spending limits, track every pound, and stay on top of your finances with intelligent budgeting tools.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-primary">
              Start Budgeting
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </Link>
            <Link to="/login" className="btn-ghost">
              Sign In
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="budget-preview">
            <div className="preview-header">
              <span className="preview-title">Monthly Budget</span>
              <span className="preview-badge">Feb 2025</span>
            </div>
            <div className="preview-amount">
              <span className="amount-value">£1,850</span>
              <span className="amount-label">remaining of £2,500</span>
            </div>
            <div className="preview-progress">
              <div className="progress-track">
                <div className="progress-fill" style={{width: '26%'}}></div>
              </div>
              <span className="progress-text">26% spent</span>
            </div>
            <div className="preview-categories">
              <div className="cat-row">
                <span className="cat-dot green"></span>
                <span className="cat-name">Groceries</span>
                <div className="cat-bar"><div className="cat-fill" style={{width: '65%'}}></div></div>
                <span className="cat-value">£195</span>
              </div>
              <div className="cat-row">
                <span className="cat-dot orange"></span>
                <span className="cat-name">Transport</span>
                <div className="cat-bar"><div className="cat-fill warning" style={{width: '85%'}}></div></div>
                <span className="cat-value">£127</span>
              </div>
              <div className="cat-row">
                <span className="cat-dot purple"></span>
                <span className="cat-name">Entertainment</span>
                <div className="cat-bar"><div className="cat-fill" style={{width: '40%'}}></div></div>
                <span className="cat-value">£80</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Budget Focused */}
      <section className="features-section">
        <div className="section-header">
          <span className="section-label">Features</span>
          <h2 className="section-title">Budgeting that actually works</h2>
        </div>

        <div className="features-bento">
          {/* Main Budget Card */}
          <div className="feature-card feature-main">
            <div className="feature-main-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            </div>
            <h3>Category Budgets</h3>
            <p>Set individual spending limits for groceries, transport, entertainment, and more. Get real-time alerts when approaching your limits.</p>
            <div className="feature-mini-visual">
              <div className="mini-cat">
                <span>Food</span>
                <div className="mini-track"><div className="mini-fill" style={{width: '70%'}}></div></div>
              </div>
              <div className="mini-cat">
                <span>Bills</span>
                <div className="mini-track"><div className="mini-fill warn" style={{width: '92%'}}></div></div>
              </div>
              <div className="mini-cat">
                <span>Shopping</span>
                <div className="mini-track"><div className="mini-fill" style={{width: '45%'}}></div></div>
              </div>
            </div>
          </div>

          {/* Other Features */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3>Expense Tracking</h3>
            <p>Log transactions and categorize spending automatically</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <h3>Income Tracking</h3>
            <p>Monitor all your income sources in one place</p>
          </div>

          <div className="feature-card feature-dark">
            <div className="feature-icon-light">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313-12.454z"/><path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/></svg>
            </div>
            <h3>AI Budget Advisor</h3>
            <p>Get smart suggestions to optimize your budget</p>
            <span className="feature-badge">New</span>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <h3>Subscriptions</h3>
            <p>Track recurring payments and find savings</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <h3>Savings Goals</h3>
            <p>Set targets and track your progress</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="how-content">
          <span className="section-label">How it works</span>
          <h2 className="section-title">Start budgeting in 3 steps</h2>
          <div className="steps-list">
            <div className="step-row">
              <div className="step-num">1</div>
              <div className="step-text">
                <h4>Set your monthly budget</h4>
                <p>Define your total spending limit for the month</p>
              </div>
            </div>
            <div className="step-row">
              <div className="step-num">2</div>
              <div className="step-text">
                <h4>Allocate by category</h4>
                <p>Split your budget across different spending categories</p>
              </div>
            </div>
            <div className="step-row">
              <div className="step-num">3</div>
              <div className="step-text">
                <h4>Track in real-time</h4>
                <p>Log expenses and watch your budget update instantly</p>
              </div>
            </div>
          </div>
        </div>
        <div className="how-visual">
          <div className="phone-mock">
            <div className="phone-screen">
              <span className="phone-label">Budget Status</span>
              <div className="phone-ring-wrap">
                <svg viewBox="0 0 36 36" className="phone-ring">
                  <path className="ring-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path className="ring-fill" strokeDasharray="74, 100" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <div className="ring-center">
                  <span className="ring-percent">74%</span>
                  <span className="ring-text">remaining</span>
                </div>
              </div>
              <span className="phone-amount">£1,850 left</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <h2>Ready to take control of your spending?</h2>
          <p>Join thousands already budgeting smarter with Nudge</p>
          <Link to="/register" className="btn-cta">
            Create Free Account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <span className="footer-logo">Nudge</span>
        <div className="footer-links">
          <Link to="/login">Sign In</Link>
          <span className="footer-dot"></span>
          <Link to="/register">Get Started</Link>
        </div>
      </footer>
    </div>
  )
}

function Dashboard({ user }) {
  const [budget, setBudget] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const getFirstName = () => {
    const name = user.name?.split(" ")[0] || "there"
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // Fetch budget and expenses data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const [budgetRes, expensesRes] = await Promise.all([
          axios.get(`${API_BASE}/budgets/current?userId=${user.id}`).catch(() => ({ data: null })),
          axios.get(`${API_BASE}/expenses?userId=${user.id}`).catch(() => ({ data: [] }))
        ])
        setBudget(budgetRes.data)
        setExpenses(expensesRes.data || [])
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.id])

  // Calculate current month expenses by category
  const { totalSpent, spentByCategory, categoryLimits } = useMemo(() => {
    const currentMonth = getCurrentMonth()
    const monthExpenses = expenses.filter(exp => exp.date?.startsWith(currentMonth))

    const spentByCategory = {}
    let totalSpent = 0
    monthExpenses.forEach(exp => {
      const cat = exp.category || "Other"
      spentByCategory[cat] = (spentByCategory[cat] || 0) + exp.amount
      totalSpent += exp.amount
    })

    let categoryLimits = {}
    if (budget?.categoryLimits) {
      try {
        categoryLimits = typeof budget.categoryLimits === 'string'
          ? JSON.parse(budget.categoryLimits)
          : budget.categoryLimits
      } catch (e) {
        categoryLimits = {}
      }
    }

    return { totalSpent, spentByCategory, categoryLimits }
  }, [expenses, budget])

  const totalBudget = budget?.totalBudget || 0
  const remaining = totalBudget - totalSpent
  const spentPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  const remainingPercent = 100 - spentPercent

  // Category colors mapping
  const categoryColors = {
    Food: 'green',
    Travel: 'orange',
    Education: 'blue',
    Leisure: 'purple',
    Other: 'gray'
  }

  // Get categories with limits
  const categoriesWithData = Object.entries(categoryLimits).map(([name, limit]) => {
    const spent = spentByCategory[name] || 0
    const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
    return { name, limit, spent, percent, color: categoryColors[name] || 'gray' }
  })

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-state">Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-greeting">
          <span className="greeting-label">{getGreeting()}</span>
          <h1>{getFirstName()}</h1>
        </div>
        <div className="dash-actions">
          <Link to="/expenses" className="action-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Expense
          </Link>
          <Link to="/chat" className="action-btn ai">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313-12.454z"/><path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/></svg>
            Ask AI
          </Link>
        </div>
      </header>

      {/* Budget Hero Card - Main Focus */}
      {totalBudget > 0 ? (
        <Link to="/budget" className="budget-hero">
          <div className="budget-hero-left">
            <span className="budget-hero-label">Monthly Budget</span>
            <div className="budget-hero-amount">
              <span className="hero-currency">£</span>
              <span className="hero-value">{remaining.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <span className="hero-remaining">remaining</span>
            </div>
            <div className="budget-hero-bar">
              <div className="hero-bar-track">
                <div className="hero-bar-fill" style={{width: `${spentPercent}%`}}></div>
              </div>
              <span className="hero-bar-text">£{totalSpent.toFixed(2)} of £{totalBudget.toFixed(2)} spent</span>
            </div>
          </div>
          <div className="budget-hero-right">
            <svg viewBox="0 0 36 36" className="budget-ring">
              <path className="ring-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path className="ring-fill" strokeDasharray={`${remainingPercent}, 100`} d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div className="budget-ring-text">
              <span className="ring-percent">{remainingPercent}%</span>
              <span className="ring-label">left</span>
            </div>
          </div>
          <div className="budget-hero-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </Link>
      ) : (
        <Link to="/budget" className="budget-hero empty">
          <div className="budget-hero-left">
            <span className="budget-hero-label">Monthly Budget</span>
            <div className="budget-hero-amount">
              <span className="hero-value">No budget set</span>
            </div>
            <p className="hero-bar-text">Create a budget to start tracking your spending</p>
          </div>
          <div className="budget-hero-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </Link>
      )}

      {/* Category Budgets */}
      {categoriesWithData.length > 0 && (
        <div className="budget-categories">
          <div className="categories-header">
            <h2>Category Budgets</h2>
            <Link to="/budget" className="view-link">Manage</Link>
          </div>
          <div className="categories-grid">
            {categoriesWithData.map(cat => (
              <div key={cat.name} className="category-card">
                <div className="category-header">
                  <span className={`category-dot ${cat.color}`}></span>
                  <span className="category-name">{cat.name}</span>
                  <span className="category-amount">£{cat.spent.toFixed(0)} / £{cat.limit}</span>
                </div>
                <div className="category-bar">
                  <div
                    className={`category-fill ${cat.percent >= 80 ? 'warning' : ''} ${cat.percent >= 100 ? 'over' : ''}`}
                    style={{width: `${Math.min(100, cat.percent)}%`}}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {expenses.length > 0 && (
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="stat-label">This month</span>
            <span className="stat-value">£{totalSpent.toFixed(2)}</span>
          </div>
          <div className="quick-stat">
            <span className="stat-label">Transactions</span>
            <span className="stat-value">{expenses.filter(e => e.date?.startsWith(getCurrentMonth())).length}</span>
          </div>
        </div>
      )}

      {/* Secondary Cards */}
      <div className="dash-grid">
        <Link to="/overview" className="dash-card">
          <div className="dash-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          </div>
          <h3>Overview</h3>
          <p>Financial analytics</p>
        </Link>

        <Link to="/expenses" className="dash-card">
          <div className="dash-card-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <h3>Expenses</h3>
          <p>Track spending</p>
        </Link>

        <Link to="/income" className="dash-card">
          <div className="dash-card-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <h3>Income</h3>
          <p>Manage earnings</p>
        </Link>

        <Link to="/subscriptions" className="dash-card">
          <div className="dash-card-icon orange">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <h3>Subscriptions</h3>
          <p>Recurring payments</p>
        </Link>

        <Link to="/plans" className="dash-card">
          <div className="dash-card-icon purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <h3>Goals</h3>
          <p>Savings targets</p>
        </Link>

        <Link to="/chat" className="dash-card ai-widget-card">
          <div className="ai-widget-header">
            <div className="ai-widget-avatar">
              <img src={budgetBot} alt="AI Assistant" />
            </div>
            <div className="ai-widget-title">
              <h3>AI Assistant</h3>
              <span className="ai-widget-status">
                <span className="status-dot"></span>
                Online
              </span>
            </div>
          </div>
          <div className="ai-widget-preview">
            <div className="ai-preview-bubble bot">
              Hi! I can help with your budget 👋
            </div>
            <div className="ai-preview-bubble user">
              How much did I spend this week?
            </div>
          </div>
          <div className="ai-widget-cta">
            Start chatting
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="home">
      <Navbar />
      <main className="main-content">
        {user ? <Dashboard user={user} /> : <LandingPage />}
      </main>
    </div>
  )
}
