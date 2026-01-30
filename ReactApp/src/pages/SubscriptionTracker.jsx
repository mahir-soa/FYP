import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"
import Navbar from "../components/Navbar"
import "./css/SubscriptionTracker.css"

const API_BASE = "http://localhost:8080/api/subscriptions"

const billingCycles = ["WEEKLY", "MONTHLY", "YEARLY"]

const providers = [
  { key: "netflix", name: "Netflix", color: "#E50914" },
  { key: "spotify", name: "Spotify", color: "#1DB954" },
  { key: "prime", name: "Prime", color: "#00A8E1" },
  { key: "disney", name: "Disney+", color: "#113CCF" },
  { key: "hulu", name: "Hulu", color: "#1CE783" },
  { key: "youtube", name: "YouTube", color: "#FF0000" },
  { key: "apple", name: "Apple", color: "#A2AAAD" },
  { key: "hbo", name: "HBO Max", color: "#B388FF" },
  { key: "other", name: "Other", color: "#6B7280" },
]

const ProviderIcon = ({ providerKey, size = 24 }) => {
  const iconStyle = { width: size, height: size }

  switch (providerKey) {
    case "netflix":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#E50914">
          <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"/>
        </svg>
      )
    case "spotify":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      )
    case "prime":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#00A8E1">
          <path d="M1.04 17.52c-.13-.12-.09-.42.1-.73 2.66-4.32 6.51-9.28 11.42-11.91 1.78-.95 3.67-1.68 5.7-1.78.18 0 .34.05.42.23.08.18.01.37-.08.52-1.21 1.91-2.77 3.68-4.53 5.26-3.84 3.44-8.4 6.17-12.56 8.03-.25.11-.37.07-.47-.62zm20.49 1.64c-.39.58-.97 1.03-1.55 1.38-.23.14-.47.15-.57-.1l-.77-1.73c-.11-.24-.03-.39.18-.49 1.47-.65 2.77-1.63 3.48-3.08.15-.3.29-.33.51-.14.87.72 1.19 1.98.72 3.16z"/>
        </svg>
      )
    case "disney":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#113CCF">
          <path d="M2.056 6.834c-.046.327-.088.66-.088 1.013 0 4.066 4.244 7.366 9.479 7.366.598 0 1.182-.042 1.749-.121-.468.973-1.336 2.248-2.478 3.263C9.457 19.479 7.927 20.4 6 20.4c-1.061 0-2.052-.31-2.783-.875-.695-.537-1.125-1.284-1.217-2.145-.092-.864.158-1.717.726-2.469a.75.75 0 1 1 1.184.918c-.349.463-.496.923-.45 1.372.046.449.276.823.682 1.137.449.347 1.096.562 1.858.562 1.346 0 2.52-.659 3.461-1.548.678-.64 1.222-1.381 1.652-2.078-5.407-.654-9.67-4.367-9.67-8.946 0-.44.051-.869.127-1.288.008-.045.02-.088.028-.133a.75.75 0 0 1 1.458.327zM18.5 10.5c0 2.485-2.015 4.5-4.5 4.5s-4.5-2.015-4.5-4.5S11.515 6 14 6s4.5 2.015 4.5 4.5zm-1.5 0c0-1.657-1.343-3-3-3s-3 1.343-3 3 1.343 3 3 3 3-1.343 3-3z"/>
        </svg>
      )
    case "hulu":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#1CE783">
          <path d="M2 6v12h4.5v-7.5c0-.83.67-1.5 1.5-1.5h3c.83 0 1.5.67 1.5 1.5V18H17V10.5c0-2.49-2.01-4.5-4.5-4.5H6c-2.21 0-4 1.79-4 4zm17 0v12h5V6z"/>
        </svg>
      )
    case "youtube":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    case "apple":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#A2AAAD">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
        </svg>
      )
    case "hbo":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#B388FF">
          <path d="M7.042 16.896H4.414v-3.754H2.708v3.754H.038V7.104h2.67v3.588h1.706V7.104h2.628v9.792zm4.266 0H8.62V7.104h5.374v2.238h-2.686v1.406h2.457v2.238h-2.457v1.672h2.686v2.238zm10.654-4.896c0 2.934-1.896 5.016-4.584 5.016-2.664 0-4.56-2.082-4.56-5.016s1.896-5.016 4.56-5.016c2.688 0 4.584 2.082 4.584 5.016zm-2.73 0c0-1.656-.768-2.604-1.854-2.604-1.074 0-1.854.948-1.854 2.604s.78 2.604 1.854 2.604c1.086 0 1.854-.948 1.854-2.604z"/>
        </svg>
      )
    default:
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="#6B7280">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )
  }
}

const getProviderInfo = (key) => providers.find(p => p.key === key) || providers.find(p => p.key === "other")

const getDateString = (daysOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split("T")[0]
}

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "Not set"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

const getDaysSince = (dateStr) => {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((today - target) / (1000 * 60 * 60 * 24))
}

export default function SubscriptionTracker() {
  const today = getDateString(0)
  const { user } = useAuth()

  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const [name, setName] = useState("")
  const [cost, setCost] = useState("")
  const [billingCycle, setBillingCycle] = useState("MONTHLY")
  const [nextPaymentDate, setNextPaymentDate] = useState("")
  const [lastUsedDate, setLastUsedDate] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [providerKey, setProviderKey] = useState("other")

  const [upcomingDays, setUpcomingDays] = useState(7)
  const [inactiveDays, setInactiveDays] = useState(30)
  const [filterStatus, setFilterStatus] = useState("ALL")

  const reloadSubscriptions = async () => {
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await axios.get(API_BASE)
      setSubscriptions(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setSubscriptions([])
      setErrorMsg("Could not load subscriptions.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadSubscriptions()
  }, [])

  const resetForm = () => {
    setName("")
    setCost("")
    setBillingCycle("MONTHLY")
    setNextPaymentDate("")
    setLastUsedDate("")
    setStatus("ACTIVE")
    setProviderKey("other")
    setEditId(null)
    setErrorMsg("")
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const filteredSubscriptions = useMemo(() => {
    if (filterStatus === "ALL") return subscriptions
    return subscriptions.filter(sub => sub.status === filterStatus)
  }, [subscriptions, filterStatus])

  const upcomingPayments = useMemo(() => {
    return subscriptions.filter(sub => {
      if (sub.status !== "ACTIVE") return false
      const daysUntil = getDaysUntil(sub.nextPaymentDate)
      return daysUntil !== null && daysUntil >= 0 && daysUntil <= upcomingDays
    })
  }, [subscriptions, upcomingDays])

  const unusedSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      if (sub.status !== "ACTIVE") return false
      const daysSince = getDaysSince(sub.lastUsedDate)
      return daysSince === null || daysSince >= inactiveDays
    })
  }, [subscriptions, inactiveDays])

  const totalMonthly = useMemo(() => {
    return subscriptions
      .filter(sub => sub.status === "ACTIVE")
      .reduce((sum, sub) => {
        if (sub.billingCycle === "MONTHLY") return sum + sub.cost
        if (sub.billingCycle === "YEARLY") return sum + (sub.cost / 12)
        if (sub.billingCycle === "WEEKLY") return sum + (sub.cost * 4.33)
        return sum
      }, 0)
  }, [subscriptions])

  const totalYearly = useMemo(() => {
    return subscriptions
      .filter(sub => sub.status === "ACTIVE")
      .reduce((sum, sub) => {
        if (sub.billingCycle === "YEARLY") return sum + sub.cost
        if (sub.billingCycle === "MONTHLY") return sum + (sub.cost * 12)
        if (sub.billingCycle === "WEEKLY") return sum + (sub.cost * 52)
        return sum
      }, 0)
  }, [subscriptions])

  const activeCount = useMemo(() => {
    return subscriptions.filter(sub => sub.status === "ACTIVE").length
  }, [subscriptions])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg("")

    if (!name.trim()) {
      setErrorMsg("Name is required.")
      return
    }
    if (!cost || Number.isNaN(Number(cost)) || Number(cost) <= 0) {
      setErrorMsg("Enter a valid cost.")
      return
    }

    const payload = {
      name: name.trim(),
      cost: Number(cost),
      billingCycle,
      nextPaymentDate: nextPaymentDate || null,
      lastUsedDate: lastUsedDate || null,
      status,
      providerKey,
    }

    try {
      if (editId) {
        await axios.put(`${API_BASE}/${editId}`, payload)
      } else {
        await axios.post(API_BASE, payload)
      }
      await reloadSubscriptions()
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
      await reloadSubscriptions()
    } catch (err) {
      setErrorMsg("Delete failed.")
      console.error(err)
    }
  }

  const handleMarkUsed = async (id) => {
    setErrorMsg("")
    try {
      await axios.patch(`${API_BASE}/${id}/mark-used`)
      await reloadSubscriptions()
    } catch (err) {
      setErrorMsg("Update failed.")
      console.error(err)
    }
  }

  const handleCancel = async (id) => {
    setErrorMsg("")
    try {
      await axios.patch(`${API_BASE}/${id}/cancel`)
      await reloadSubscriptions()
    } catch (err) {
      setErrorMsg("Cancel failed.")
      console.error(err)
    }
  }

  const handleEdit = (sub) => {
    setEditId(sub.id)
    setName(sub.name || "")
    setCost(sub.cost?.toString() || "")
    setBillingCycle(sub.billingCycle || "MONTHLY")
    setNextPaymentDate(sub.nextPaymentDate || "")
    setLastUsedDate(sub.lastUsedDate || "")
    setStatus(sub.status || "ACTIVE")
    setProviderKey(sub.providerKey || "other")
    setShowForm(true)
  }

  return (
    <div className="subscription-page">
      <Navbar />

      <main className="subscription-main">
        <div className="subscription-header">
          <h1>Subscriptions</h1>
          <p>Track and manage your recurring payments</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Monthly Cost</div>
            <div className="stat-value">£{totalMonthly.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Yearly Cost</div>
            <div className="stat-value">£{totalYearly.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value">{activeCount}</div>
          </div>
        </div>

        {upcomingPayments.length > 0 && (
          <div className="alert-section upcoming">
            <div className="alert-header">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
              <span>Upcoming Payments (within {upcomingDays} days)</span>
            </div>
            <div className="alert-list">
              {upcomingPayments.map(sub => {
                const daysUntil = getDaysUntil(sub.nextPaymentDate)
                const provider = getProviderInfo(sub.providerKey)
                return (
                  <div key={sub.id} className="alert-item">
                    <div className="alert-icon" style={{ backgroundColor: provider.color + "20" }}>
                      <ProviderIcon providerKey={sub.providerKey} size={20} />
                    </div>
                    <div className="alert-info">
                      <span className="alert-name">{sub.name}</span>
                      <span className="alert-detail">
                        £{sub.cost.toFixed(2)} · {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                      </span>
                    </div>
                    <button className="alert-action" onClick={() => handleEdit(sub)}>Edit</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {unusedSubscriptions.length > 0 && (
          <div className="alert-section unused">
            <div className="alert-header">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>Unused Subscriptions (not used in {inactiveDays}+ days)</span>
            </div>
            <div className="alert-list">
              {unusedSubscriptions.map(sub => {
                const daysSince = getDaysSince(sub.lastUsedDate)
                const provider = getProviderInfo(sub.providerKey)
                return (
                  <div key={sub.id} className="alert-item">
                    <div className="alert-icon" style={{ backgroundColor: provider.color + "20" }}>
                      <ProviderIcon providerKey={sub.providerKey} size={20} />
                    </div>
                    <div className="alert-info">
                      <span className="alert-name">{sub.name}</span>
                      <span className="alert-detail">
                        £{sub.cost.toFixed(2)}/{sub.billingCycle.toLowerCase()} · {daysSince === null ? "Never used" : `Last used ${daysSince} days ago`}
                      </span>
                    </div>
                    <div className="alert-actions">
                      <button className="alert-action mark" onClick={() => handleMarkUsed(sub.id)}>Mark Used</button>
                      <button className="alert-action cancel" onClick={() => handleCancel(sub.id)}>Cancel</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="subscription-controls">
          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Subscription
          </button>
        </div>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        {loading ? (
          <div className="loading-msg">
            <div className="loading-spinner"></div>
            Loading subscriptions...
          </div>
        ) : filteredSubscriptions.length > 0 ? (
          <>
            <div className="section-header">
              <h2 className="section-title">Your Subscriptions</h2>
              <span className="subscription-count">
                {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="subscription-list">
              {filteredSubscriptions.map((sub) => {
                const provider = getProviderInfo(sub.providerKey)
                const daysUntil = getDaysUntil(sub.nextPaymentDate)
                const daysSince = getDaysSince(sub.lastUsedDate)
                return (
                  <div key={sub.id} className={`subscription-card ${sub.status.toLowerCase()}`}>
                    <div className="subscription-icon" style={{ backgroundColor: provider.color + "15" }}>
                      <ProviderIcon providerKey={sub.providerKey} size={28} />
                    </div>
                    <div className="subscription-details">
                      <div className="subscription-top">
                        <span className="subscription-name">{sub.name}</span>
                        <span className={`subscription-status status-${sub.status.toLowerCase()}`}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="subscription-meta">
                        <span className="subscription-cycle">
                          £{sub.cost.toFixed(2)} / {sub.billingCycle.toLowerCase()}
                        </span>
                        {sub.nextPaymentDate && (
                          <span className="subscription-payment">
                            Next: {formatDisplayDate(sub.nextPaymentDate)}
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
                              <span className="payment-soon"> ({daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`})</span>
                            )}
                          </span>
                        )}
                      </div>
                      {sub.lastUsedDate && (
                        <p className="subscription-used">
                          Last used: {formatDisplayDate(sub.lastUsedDate)}
                          {daysSince !== null && daysSince >= 30 && (
                            <span className="unused-warning"> ({daysSince}d ago)</span>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="subscription-cost">£{sub.cost.toFixed(2)}</span>
                    <div className="subscription-actions">
                      {sub.status === "ACTIVE" && (
                        <button className="action-btn mark" onClick={() => handleMarkUsed(sub.id)}>Mark Used</button>
                      )}
                      <button className="action-btn edit" onClick={() => handleEdit(sub)}>Edit</button>
                      {sub.status === "ACTIVE" && (
                        <button className="action-btn cancel" onClick={() => handleCancel(sub.id)}>Cancel</button>
                      )}
                      <button className="action-btn delete" onClick={() => handleDelete(sub.id)}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h3>No subscriptions tracked</h3>
            <p>Start tracking your recurring payments by adding your first subscription</p>
            <button className="add-btn" onClick={() => setShowForm(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Subscription
            </button>
          </div>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit Subscription" : "New Subscription"}</h2>
              <button className="modal-close" onClick={closeForm}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="subscription-form">
              <div className="form-group">
                <label>Provider</label>
                <div className="provider-grid">
                  {providers.map((p) => (
                    <div
                      key={p.key}
                      className={`provider-option ${providerKey === p.key ? "selected" : ""}`}
                      onClick={() => {
                        setProviderKey(p.key)
                        if (!name && p.key !== "other") {
                          setName(p.name)
                        }
                      }}
                      style={{ "--provider-color": p.color }}
                    >
                      <ProviderIcon providerKey={p.key} size={24} />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Subscription name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Billing Cycle</label>
                  <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
                    {billingCycles.map((c) => (
                      <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Next Payment Date</label>
                  <input
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Last Used Date</label>
                  <input
                    type="date"
                    value={lastUsedDate}
                    onChange={(e) => setLastUsedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
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
