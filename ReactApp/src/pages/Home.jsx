import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/api"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import budgetBot from "../assets/budget-bot.png"
import { fmt } from "../utils/format"
import "./css/Home.css"

function LandingPage() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Budgeting that<br />
            <span className="gradient-text">learns you</span>
          </h1>
          <p className="hero-subtitle">
            Nudge learns how you spend and gives you timely guidance, not just charts and categories.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-primary">
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </Link>
            <Link to="/login" className="btn-ghost">Sign In</Link>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-bento">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3>Adaptive Budgets</h3>
            <p>Your budget adjusts based on your actual spending patterns, not fixed rules.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
            </div>
            <h3>Spending Persona</h3>
            <p>Find out if you're a cautious saver, weekend splurger, or something else entirely.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <h3>Smart Nudges</h3>
            <p>Timely warnings when you're overspending, not a wall of notifications.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <h3>Plans & Goals</h3>
            <p>Describe what you want in plain English and the AI sets it up for you.</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-inner">
          <h2>Start tracking, the rest follows</h2>
          <p>Add your income and expenses. Nudge handles the budgeting.</p>
          <Link to="/register" className="btn-cta">
            Create Free Account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

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
  const [persona, setPersona] = useState(null)
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

  // Fetch budget, expenses, and persona data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const [budgetRes, expensesRes, personaRes] = await Promise.all([
          api.get(`/budgets/current?userId=${user.id}`).catch(() => ({ data: null })),
          api.get(`/expenses?userId=${user.id}`).catch(() => ({ data: [] })),
          api.get(`/ml/persona/${user.id}`).catch(() => ({ data: null }))
        ])
        setBudget(budgetRes.data)
        setExpenses(expensesRes.data || [])
        if (personaRes.data && personaRes.data.persona_type) {
          setPersona(personaRes.data)
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.id])

  // Calculate current month total spend
  const totalSpent = useMemo(() => {
    const currentMonth = getCurrentMonth()
    const monthExpenses = expenses.filter(exp => exp.date?.startsWith(currentMonth))
    return monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  }, [expenses])

  const totalBudget = budget?.totalBudget || 0
  const remaining = totalBudget - totalSpent
  const spentPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  const remainingPercent = 100 - spentPercent

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-state">Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Ask AI
          </Link>
        </div>
      </header>

      
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
              <span className="hero-bar-text">£{fmt(totalSpent)} of £{fmt(totalBudget)} spent</span>
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

      
      {expenses.length > 0 && (
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="stat-label">This month</span>
            <span className="stat-value">£{fmt(totalSpent)}</span>
          </div>
          <div className="quick-stat">
            <span className="stat-label">Transactions</span>
            <span className="stat-value">{expenses.filter(e => e.date?.startsWith(getCurrentMonth())).length}</span>
          </div>
        </div>
      )}

      
      <Link to="/persona" className="persona-banner">
        <div className="persona-banner-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div className="persona-banner-content">
          {persona ? (
            <>
              <span className="persona-banner-label">Your Spending Persona</span>
              <span className="persona-banner-type">{persona.persona_primary || persona.persona_type}</span>
              {persona.confidence_level && (
                <span className="persona-banner-confidence">{persona.confidence_level} confidence</span>
              )}
            </>
          ) : (
            <>
              <span className="persona-banner-label">Spending Persona</span>
              <span className="persona-banner-type">Discover your type</span>
              <span className="persona-banner-confidence">Log expenses to unlock your spending profile</span>
            </>
          )}
        </div>
        <div className="persona-banner-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
        </div>
      </Link>

      
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
          <h3>Plans</h3>
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
              Hi! I can help with your budget
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
