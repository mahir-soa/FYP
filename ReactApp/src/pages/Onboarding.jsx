import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import { fmt } from "../utils/format"
import "./css/Onboarding.css"

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "employment", title: "Employment" },
  { id: "income", title: "Income" },
  { id: "goal", title: "Goals" },
  { id: "budget", title: "Budget Style" },
  { id: "subscriptions", title: "Subscriptions" },
  { id: "nudges", title: "Notifications" },
]

const OnboardIcon = ({ type, size = 20 }) => {
  const s = { width: size, height: size }
  switch (type) {
    case "briefcase": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
    case "clock": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    case "laptop": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
    case "chart": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
    case "alert": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    case "target": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
    case "card": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    case "cart": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
    case "trending": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    case "graduation": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/></svg>
    case "leaf": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75"/></svg>
    case "scale": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="1 12 5 8 9 12"/><polyline points="15 12 19 8 23 12"/><path d="M1 12a4 4 0 004 4h2"/><path d="M23 12a4 4 0 01-4 4h-2"/></svg>
    case "film": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>
    case "music": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case "package": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
    case "play": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    case "apple": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C9 2 6 5 6 8c0 6 6 14 6 14s6-8 6-14c0-3-3-6-6-6z"/></svg>
    case "dumbbell": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg>
    case "cloud": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>
    case "dollar": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    case "bell": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    case "calendar": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    case "warning": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    case "moon": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
    case "sparkle": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case "wave": return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    default: return null
  }
}

const EMPLOYMENT_TYPES = [
  { type: "SALARIED", icon: "briefcase", label: "Salaried", description: "Fixed annual or monthly salary" },
  { type: "HOURLY", icon: "clock", label: "Hourly", description: "Paid by the hour" },
  { type: "FREELANCE", icon: "laptop", label: "Freelance", description: "Variable income" },
  { type: "OTHER", icon: "chart", label: "Other", description: "Benefits, investments, etc." },
]

const PAY_FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly", multiplier: 52 },
  { value: "BIWEEKLY", label: "Every 2 weeks", multiplier: 26 },
  { value: "MONTHLY", label: "Monthly", multiplier: 12 },
]

const GOAL_TYPES = [
  { type: "EMERGENCY", icon: "alert", label: "Emergency Fund", description: "Build 3-6 months of expenses for security" },
  { type: "SAVINGS", icon: "target", label: "Savings Goal", description: "Save for something specific like a holiday" },
  { type: "DEBT", icon: "card", label: "Pay Off Debt", description: "Clear credit cards, loans, or overdrafts" },
  { type: "PURCHASE", icon: "cart", label: "Big Purchase", description: "Save for a car, home deposit, etc." },
  { type: "INVESTMENT", icon: "trending", label: "Investment", description: "Build wealth for the future" },
  { type: "EDUCATION", icon: "graduation", label: "Education", description: "Courses, certifications, or degrees" },
]

const BUDGET_STYLES = [
  { style: "LIGHT", icon: "leaf", label: "Light Touch", description: "Gentle reminders, more flexibility" },
  { style: "NORMAL", icon: "scale", label: "Balanced", description: "Regular guidance, sensible limits" },
  { style: "STRICT", icon: "target", label: "Strict", description: "Tight budgets, aggressive savings" },
]

const CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Entertainment",
  "Shopping",
  "Health",
  "Bills & Utilities",
  "Dining Out",
  "Coffee & Drinks",
]

const POPULAR_SUBSCRIPTIONS = [
  { name: "Netflix", icon: "film", cost: 10.99 },
  { name: "Spotify", icon: "music", cost: 10.99 },
  { name: "Amazon Prime", icon: "package", cost: 8.99 },
  { name: "Disney+", icon: "sparkle", cost: 7.99 },
  { name: "YouTube Premium", icon: "play", cost: 12.99 },
  { name: "Apple Music", icon: "music", cost: 10.99 },
  { name: "Gym Membership", icon: "dumbbell", cost: 30.00 },
  { name: "iCloud", icon: "cloud", cost: 2.99 },
]

export default function Onboarding() {
  const { user, setOnboardingComplete } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Collected data across steps
  const [data, setData] = useState({
    // Employment & Income
    employmentType: "",
    payFrequency: "MONTHLY",
    payDay: "",
    // Salaried fields
    annualSalary: "",
    // Hourly fields
    hourlyRate: "",
    hoursPerWeek: "",
    // Freelance/Other
    estimatedMonthly: "",
    // Goal
    goalType: "SAVINGS",
    goalTitle: "",
    goalAmount: "",
    goalDate: "",
    goalMonthlyContribution: "",
    // Budget preferences
    budgetStyle: "NORMAL",
    priorityCategories: [],
    cutCategories: [],
    // Subscriptions
    subscriptions: [],
    // Nudge settings
    nudgeFrequency: "WEEKLY",
    nudgeBudgetWarnings: true,
    nudgeUpcomingPayments: true,
    nudgeUnusedSubscriptions: true,
    nudgeGoalProgress: true,
  })

  // Calculate monthly income based on employment type
  const calculatedMonthlyIncome = useMemo(() => {
    switch (data.employmentType) {
      case "SALARIED":
        return data.annualSalary ? Number(data.annualSalary) / 12 : 0
      case "HOURLY":
        if (data.hourlyRate && data.hoursPerWeek) {
          return (Number(data.hourlyRate) * Number(data.hoursPerWeek) * 52) / 12
        }
        return 0
      case "FREELANCE":
      case "OTHER":
        return data.estimatedMonthly ? Number(data.estimatedMonthly) : 0
      default:
        return 0
    }
  }, [data.employmentType, data.annualSalary, data.hourlyRate, data.hoursPerWeek, data.estimatedMonthly])

  // Calculate months to goal
  const monthsToGoal = useMemo(() => {
    if (data.goalAmount && data.goalMonthlyContribution && Number(data.goalMonthlyContribution) > 0) {
      return Math.ceil(Number(data.goalAmount) / Number(data.goalMonthlyContribution))
    }
    return null
  }, [data.goalAmount, data.goalMonthlyContribution])

  const updateData = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
    setError("")
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const toggleCategory = (category, listKey) => {
    const otherListKey = listKey === "priorityCategories" ? "cutCategories" : "priorityCategories"
    setData(prev => {
      const list = prev[listKey]
      const otherList = prev[otherListKey]
      if (list.includes(category)) {
        return { ...prev, [listKey]: list.filter(c => c !== category) }
      } else {
        return {
          ...prev,
          [listKey]: [...list, category],
          [otherListKey]: otherList.filter(c => c !== category)
        }
      }
    })
  }

  const toggleSubscription = (sub) => {
    setData(prev => {
      const exists = prev.subscriptions.find(s => s.name === sub.name)
      if (exists) {
        return { ...prev, subscriptions: prev.subscriptions.filter(s => s.name !== sub.name) }
      } else {
        return { ...prev, subscriptions: [...prev.subscriptions, { ...sub, billingCycle: "MONTHLY" }] }
      }
    })
  }

  const toggleNudge = (key) => {
    setData(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const validateStep = () => {
    switch (STEPS[currentStep].id) {
      case "employment":
        if (!data.employmentType) {
          setError("Please select your employment type")
          return false
        }
        break
      case "income":
        if (data.employmentType === "SALARIED") {
          if (!data.annualSalary || Number(data.annualSalary) <= 0) {
            setError("Please enter your annual salary")
            return false
          }
        } else if (data.employmentType === "HOURLY") {
          if (!data.hourlyRate || Number(data.hourlyRate) <= 0) {
            setError("Please enter your hourly rate")
            return false
          }
          if (!data.hoursPerWeek || Number(data.hoursPerWeek) <= 0) {
            setError("Please enter your hours per week")
            return false
          }
        } else {
          if (!data.estimatedMonthly || Number(data.estimatedMonthly) <= 0) {
            setError("Please enter your estimated monthly income")
            return false
          }
        }
        break
      case "goal":
        if (!data.goalAmount || Number(data.goalAmount) <= 0) {
          setError("Please enter a target amount for your goal")
          return false
        }
        break
    }
    return true
  }

  const handleContinue = () => {
    if (validateStep()) {
      nextStep()
    }
  }

  const completeOnboarding = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      // 1. Create income record with calculated monthly amount
      if (calculatedMonthlyIncome > 0) {
        const incomeSource = data.employmentType === "SALARIED" ? "Salary" :
                            data.employmentType === "HOURLY" ? "Hourly Wages" :
                            data.employmentType === "FREELANCE" ? "Freelance" : "Other Income"

        await api.post(`/incomes?userId=${user.id}`, {
          source: incomeSource,
          amount: calculatedMonthlyIncome,
          frequency: "MONTHLY",
          date: new Date().toISOString().split("T")[0],
        })
      }

      // 2. Create goal
      if (data.goalAmount && Number(data.goalAmount) > 0) {
        // Calculate target date based on monthly contribution
        let targetDate = data.goalDate || null
        if (!targetDate && data.goalMonthlyContribution && Number(data.goalMonthlyContribution) > 0) {
          const months = Math.ceil(Number(data.goalAmount) / Number(data.goalMonthlyContribution))
          const target = new Date()
          target.setMonth(target.getMonth() + months)
          targetDate = target.toISOString().split("T")[0]
        }

        await api.post(`/plans?userId=${user.id}`, {
          title: data.goalTitle || GOAL_TYPES.find(g => g.type === data.goalType)?.label,
          family: "OUTCOME_PLAN",
          type: data.goalType,
          targetAmount: Number(data.goalAmount),
          currentAmount: 0,
          targetDate: targetDate,
        })
      }

      // 3. Create subscriptions
      for (const sub of data.subscriptions) {
        await api.post(`/subscriptions?userId=${user.id}`, {
          name: sub.name,
          cost: sub.cost,
          billingCycle: sub.billingCycle,
          status: "ACTIVE",
          category: "OTHER",
        })
      }

      // 4. Save preferences and mark complete
      await api.post(`/onboarding/complete?userId=${user.id}`, {
        budgetStyle: data.budgetStyle,
        priorityCategories: data.priorityCategories,
        cutCategories: data.cutCategories,
        primaryPayFrequency: data.payFrequency,
        payDay: data.payDay ? Number(data.payDay) : null,
        nudgeFrequency: data.nudgeFrequency,
        nudgeBudgetWarnings: data.nudgeBudgetWarnings,
        nudgeUpcomingPayments: data.nudgeUpcomingPayments,
        nudgeUnusedSubscriptions: data.nudgeUnusedSubscriptions,
        nudgeGoalProgress: data.nudgeGoalProgress,
      })

      // Update auth context
      if (setOnboardingComplete) {
        setOnboardingComplete()
      }

      navigate("/overview")
    } catch (err) {
      console.error("Onboarding failed:", err)
      setError(err.response?.data?.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case "welcome":
        return (
          <div className="step-content">
            <div className="step-header welcome-header">
              <span className="welcome-emoji"><OnboardIcon type="bell" size={28} /></span>
              <h2>Welcome to Nudge{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h2>
              <p>Let's set up your account in about 2 minutes. We'll create a personalized budget and help you reach your financial goals.</p>
            </div>
            <div className="welcome-features">
              <div className="feature-item">
                <span className="feature-icon"><OnboardIcon type="dollar" /></span>
                <span>Smart budget suggestions</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"><OnboardIcon type="target" /></span>
                <span>Goal tracking</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon"><OnboardIcon type="bell" /></span>
                <span>Helpful nudges</span>
              </div>
            </div>
            <p className="welcome-tip">Tip: When logging expenses, tagging your mood is optional but helps us build a more accurate spending persona.</p>
            <div className="step-actions single">
              <button className="btn-primary" onClick={nextStep}>
                Let's Go
              </button>
            </div>
          </div>
        )

      case "employment":
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>How do you earn?</h2>
              <p>This helps us calculate your budget accurately</p>
            </div>
            <div className="step-form">
              <div className="employment-type-grid">
                {EMPLOYMENT_TYPES.map((emp) => (
                  <button
                    key={emp.type}
                    className={`employment-type-card ${data.employmentType === emp.type ? "selected" : ""}`}
                    onClick={() => updateData("employmentType", emp.type)}
                  >
                    <span className="emp-icon">{<OnboardIcon type={emp.icon} />}</span>
                    <span className="emp-label">{emp.label}</span>
                    <span className="emp-desc">{emp.description}</span>
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="step-actions">
              <button className="btn-secondary" onClick={prevStep}>Back</button>
              <button className="btn-primary" onClick={handleContinue}>Continue</button>
            </div>
          </div>
        )

      case "income":
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>
                {data.employmentType === "SALARIED" && "What's your salary?"}
                {data.employmentType === "HOURLY" && "What's your hourly rate?"}
                {data.employmentType === "FREELANCE" && "What's your average income?"}
                {data.employmentType === "OTHER" && "What's your monthly income?"}
              </h2>
              <p>We'll calculate your monthly budget from this</p>
            </div>
            <div className="step-form">
              {data.employmentType === "SALARIED" && (
                <div className="form-group">
                  <label>Annual salary (before tax)</label>
                  <div className="input-with-prefix">
                    <span className="prefix">£</span>
                    <input
                      type="number"
                      value={data.annualSalary}
                      onChange={(e) => updateData("annualSalary", e.target.value)}
                      placeholder="e.g., 35000"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {data.employmentType === "HOURLY" && (
                <>
                  <div className="form-group">
                    <label>Hourly rate</label>
                    <div className="input-with-prefix">
                      <span className="prefix">£</span>
                      <input
                        type="number"
                        step="0.01"
                        value={data.hourlyRate}
                        onChange={(e) => updateData("hourlyRate", e.target.value)}
                        placeholder="e.g., 12.50"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Average hours per week</label>
                    <input
                      type="number"
                      value={data.hoursPerWeek}
                      onChange={(e) => updateData("hoursPerWeek", e.target.value)}
                      placeholder="e.g., 40"
                    />
                  </div>
                </>
              )}

              {(data.employmentType === "FREELANCE" || data.employmentType === "OTHER") && (
                <div className="form-group">
                  <label>Estimated monthly income (after tax)</label>
                  <div className="input-with-prefix">
                    <span className="prefix">£</span>
                    <input
                      type="number"
                      value={data.estimatedMonthly}
                      onChange={(e) => updateData("estimatedMonthly", e.target.value)}
                      placeholder="e.g., 2500"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>How often are you paid?</label>
                <div className="option-grid">
                  {PAY_FREQUENCIES.map((freq) => (
                    <button
                      key={freq.value}
                      className={`option-btn ${data.payFrequency === freq.value ? "selected" : ""}`}
                      onClick={() => updateData("payFrequency", freq.value)}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>What day do you get paid? <span className="optional">(optional)</span></label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={data.payDay}
                  onChange={(e) => updateData("payDay", e.target.value)}
                  placeholder="e.g., 25"
                />
              </div>

              {calculatedMonthlyIncome > 0 && (
                <div className="income-summary">
                  <div className="summary-label">Your estimated monthly income</div>
                  <div className="summary-amount">£{calculatedMonthlyIncome.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              )}
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="step-actions">
              <button className="btn-secondary" onClick={prevStep}>Back</button>
              <button className="btn-primary" onClick={handleContinue}>Continue</button>
            </div>
          </div>
        )

      case "goal":
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Set your first goal</h2>
              <p>What would you like to achieve? You can add more goals later.</p>
            </div>
            <div className="step-form">
              <div className="goal-type-grid">
                {GOAL_TYPES.map((goal) => (
                  <button
                    key={goal.type}
                    className={`goal-type-card ${data.goalType === goal.type ? "selected" : ""}`}
                    onClick={() => updateData("goalType", goal.type)}
                  >
                    <span className="goal-icon">{<OnboardIcon type={goal.icon} />}</span>
                    <span className="goal-label">{goal.label}</span>
                    <span className="goal-desc">{goal.description}</span>
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label>Goal name <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={data.goalTitle}
                  onChange={(e) => updateData("goalTitle", e.target.value)}
                  placeholder={GOAL_TYPES.find(g => g.type === data.goalType)?.label}
                />
              </div>

              <div className="form-group">
                <label>How much do you want to save?</label>
                <div className="input-with-prefix">
                  <span className="prefix">£</span>
                  <input
                    type="number"
                    value={data.goalAmount}
                    onChange={(e) => updateData("goalAmount", e.target.value)}
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>How much can you save each month? <span className="optional">(optional)</span></label>
                <div className="input-with-prefix">
                  <span className="prefix">£</span>
                  <input
                    type="number"
                    value={data.goalMonthlyContribution}
                    onChange={(e) => updateData("goalMonthlyContribution", e.target.value)}
                    placeholder="e.g., 200"
                  />
                </div>
                {calculatedMonthlyIncome > 0 && (
                  <p className="form-hint">
                    Suggested: £{fmt(Math.round(calculatedMonthlyIncome * 0.1), 0)} - £{fmt(Math.round(calculatedMonthlyIncome * 0.2), 0)} (10-20% of income)
                  </p>
                )}
              </div>

              {monthsToGoal && data.goalAmount && (
                <div className="goal-timeline">
                  <div className="timeline-icon"><OnboardIcon type="calendar" /></div>
                  <div className="timeline-info">
                    <span className="timeline-label">You'll reach your goal in</span>
                    <span className="timeline-value">
                      {monthsToGoal} {monthsToGoal === 1 ? "month" : "months"}
                      {monthsToGoal >= 12 && ` (${(monthsToGoal / 12).toFixed(1)} years)`}
                    </span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Or set a specific target date <span className="optional">(optional)</span></label>
                <input
                  type="date"
                  value={data.goalDate}
                  onChange={(e) => updateData("goalDate", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="step-actions">
              <button className="btn-secondary" onClick={prevStep}>Back</button>
              <button className="btn-primary" onClick={handleContinue}>Continue</button>
            </div>
          </div>
        )

      case "budget":
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>How should we budget?</h2>
              <p>Choose your spending style and priorities</p>
            </div>
            <div className="step-form">
              <div className="form-group">
                <label>Budget style</label>
                <div className="budget-style-grid">
                  {BUDGET_STYLES.map((style) => (
                    <button
                      key={style.style}
                      className={`budget-style-card ${data.budgetStyle === style.style ? "selected" : ""}`}
                      onClick={() => updateData("budgetStyle", style.style)}
                    >
                      <span className="style-icon">{<OnboardIcon type={style.icon} />}</span>
                      <span className="style-label">{style.label}</span>
                      <span className="style-desc">{style.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Categories to protect <span className="optional">(optional)</span></label>
                <p className="form-hint">These won't be reduced in your budget</p>
                <div className="category-chip-grid">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`category-chip ${data.priorityCategories.includes(cat) ? "selected protect" : ""}`}
                      onClick={() => toggleCategory(cat, "priorityCategories")}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Categories to cut <span className="optional">(optional)</span></label>
                <p className="form-hint">We'll suggest lower budgets for these</p>
                <div className="category-chip-grid">
                  {CATEGORIES.filter(c => !data.priorityCategories.includes(c)).map((cat) => (
                    <button
                      key={cat}
                      className={`category-chip ${data.cutCategories.includes(cat) ? "selected cut" : ""}`}
                      onClick={() => toggleCategory(cat, "cutCategories")}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="step-actions">
              <button className="btn-secondary" onClick={prevStep}>Back</button>
              <button className="btn-primary" onClick={nextStep}>Continue</button>
            </div>
          </div>
        )

      case "subscriptions":
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Any subscriptions?</h2>
              <p>Select any services you're subscribed to (you can edit these later)</p>
            </div>
            <div className="step-form">
              <div className="subscription-grid">
                {POPULAR_SUBSCRIPTIONS.map((sub) => (
                  <button
                    key={sub.name}
                    className={`subscription-card ${data.subscriptions.find(s => s.name === sub.name) ? "selected" : ""}`}
                    onClick={() => toggleSubscription(sub)}
                  >
                    <span className="sub-icon">{<OnboardIcon type={sub.icon} />}</span>
                    <span className="sub-name">{sub.name}</span>
                    <span className="sub-cost">£{fmt(sub.cost)}/mo</span>
                  </button>
                ))}
              </div>
              {data.subscriptions.length > 0 && (
                <div className="selected-total">
                  {data.subscriptions.length} selected · £{fmt(data.subscriptions.reduce((sum, s) => sum + s.cost, 0))}/month
                </div>
              )}
            </div>
            <div className="step-actions">
              <button className="btn-secondary" onClick={prevStep}>Back</button>
              <button className="btn-skip" onClick={nextStep}>Skip</button>
              <button className="btn-primary" onClick={nextStep}>Continue</button>
            </div>
          </div>
        )

      case "nudges":
        return (
          <div className="step-content">
            <div className="step-header">
              <h2>Stay on track with nudges</h2>
              <p>Choose how we keep you informed</p>
            </div>
            <div className="step-form">
              <div className="form-group">
                <label>How often?</label>
                <div className="option-grid">
                  {["DAILY", "WEEKLY", "MINIMAL"].map((freq) => (
                    <button
                      key={freq}
                      className={`option-btn ${data.nudgeFrequency === freq ? "selected" : ""}`}
                      onClick={() => updateData("nudgeFrequency", freq)}
                    >
                      {freq === "DAILY" && "Daily digest"}
                      {freq === "WEEKLY" && "Weekly summary"}
                      {freq === "MINIMAL" && "Important only"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>What to notify about</label>
                <div className="toggle-list">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-icon"><OnboardIcon type="warning" /></span>
                      <div>
                        <span className="toggle-label">Budget warnings</span>
                        <span className="toggle-desc">When you're close to or over budget</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-btn ${data.nudgeBudgetWarnings ? "on" : ""}`}
                      onClick={() => toggleNudge("nudgeBudgetWarnings")}
                    />
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-icon"><OnboardIcon type="calendar" /></span>
                      <div>
                        <span className="toggle-label">Upcoming payments</span>
                        <span className="toggle-desc">Bills and subscriptions due soon</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-btn ${data.nudgeUpcomingPayments ? "on" : ""}`}
                      onClick={() => toggleNudge("nudgeUpcomingPayments")}
                    />
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-icon"><OnboardIcon type="moon" /></span>
                      <div>
                        <span className="toggle-label">Unused subscriptions</span>
                        <span className="toggle-desc">Services you haven't used recently</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-btn ${data.nudgeUnusedSubscriptions ? "on" : ""}`}
                      onClick={() => toggleNudge("nudgeUnusedSubscriptions")}
                    />
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-icon"><OnboardIcon type="target" /></span>
                      <div>
                        <span className="toggle-label">Goal progress</span>
                        <span className="toggle-desc">Updates on your savings goals</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-btn ${data.nudgeGoalProgress ? "on" : ""}`}
                      onClick={() => toggleNudge("nudgeGoalProgress")}
                    />
                  </div>
                </div>
              </div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="step-actions">
              <button className="btn-secondary" onClick={prevStep}>Back</button>
              <button
                className="btn-primary complete"
                onClick={completeOnboarding}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Setting up..." : "Get Started"}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="progress-indicator">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`progress-dot ${index === currentStep ? "active" : ""} ${index < currentStep ? "completed" : ""}`}
            />
          ))}
        </div>
        <div className="onboarding-content">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
