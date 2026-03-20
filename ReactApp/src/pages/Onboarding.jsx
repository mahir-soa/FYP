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

const EMPLOYMENT_TYPES = [
  { type: "SALARIED", icon: "💼", label: "Salaried", description: "Fixed annual or monthly salary" },
  { type: "HOURLY", icon: "⏰", label: "Hourly", description: "Paid by the hour" },
  { type: "FREELANCE", icon: "💻", label: "Freelance", description: "Variable income" },
  { type: "OTHER", icon: "📊", label: "Other", description: "Benefits, investments, etc." },
]

const PAY_FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly", multiplier: 52 },
  { value: "BIWEEKLY", label: "Every 2 weeks", multiplier: 26 },
  { value: "MONTHLY", label: "Monthly", multiplier: 12 },
]

const GOAL_TYPES = [
  { type: "EMERGENCY", icon: "🚨", label: "Emergency Fund", description: "Build 3-6 months of expenses for security" },
  { type: "SAVINGS", icon: "🎯", label: "Savings Goal", description: "Save for something specific like a holiday" },
  { type: "DEBT", icon: "💳", label: "Pay Off Debt", description: "Clear credit cards, loans, or overdrafts" },
  { type: "PURCHASE", icon: "🛒", label: "Big Purchase", description: "Save for a car, home deposit, etc." },
  { type: "INVESTMENT", icon: "📈", label: "Investment", description: "Build wealth for the future" },
  { type: "EDUCATION", icon: "🎓", label: "Education", description: "Courses, certifications, or degrees" },
]

const BUDGET_STYLES = [
  { style: "LIGHT", icon: "🌿", label: "Light Touch", description: "Gentle reminders, more flexibility" },
  { style: "NORMAL", icon: "⚖️", label: "Balanced", description: "Regular guidance, sensible limits" },
  { style: "STRICT", icon: "🎯", label: "Strict", description: "Tight budgets, aggressive savings" },
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
  { name: "Netflix", icon: "🎬", cost: 10.99 },
  { name: "Spotify", icon: "🎵", cost: 10.99 },
  { name: "Amazon Prime", icon: "📦", cost: 8.99 },
  { name: "Disney+", icon: "✨", cost: 7.99 },
  { name: "YouTube Premium", icon: "▶️", cost: 12.99 },
  { name: "Apple Music", icon: "🍎", cost: 10.99 },
  { name: "Gym Membership", icon: "💪", cost: 30.00 },
  { name: "iCloud", icon: "☁️", cost: 2.99 },
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
              <span className="welcome-emoji">👋</span>
              <h2>Welcome to Nudge{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h2>
              <p>Let's set up your account in about 2 minutes. We'll create a personalized budget and help you reach your financial goals.</p>
            </div>
            <div className="welcome-features">
              <div className="feature-item">
                <span className="feature-icon">💰</span>
                <span>Smart budget suggestions</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <span>Goal tracking</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔔</span>
                <span>Helpful nudges</span>
              </div>
            </div>
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
                    <span className="emp-icon">{emp.icon}</span>
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
                    <span className="goal-icon">{goal.icon}</span>
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
                  <div className="timeline-icon">📅</div>
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
                      <span className="style-icon">{style.icon}</span>
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
                    <span className="sub-icon">{sub.icon}</span>
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
                      <span className="toggle-icon">⚠️</span>
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
                      <span className="toggle-icon">📅</span>
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
                      <span className="toggle-icon">💤</span>
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
                      <span className="toggle-icon">🎯</span>
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
