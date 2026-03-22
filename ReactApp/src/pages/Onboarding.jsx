import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import nudgeLogo from "../assets/nudge logo.PNG"
import budgetImg from "../assets/budget page.png"
import personaImg from "../assets/persona.png"
import nudgeImg from "../assets/Nudge.png"
import plansImg from "../assets/plans : goals.png"
import "./css/Onboarding.css"

const STEPS = [
  { id: "welcome" },
  { id: "budget" },
  { id: "persona" },
  { id: "nudges" },
  { id: "plans" },
]

export default function Onboarding() {
  const { user, setOnboardingComplete } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      finish()
    }
  }

  const finish = async () => {
    setIsSubmitting(true)
    try {
      await api.post(`/onboarding/complete?userId=${user.id}`, {})
      if (setOnboardingComplete) setOnboardingComplete()
      navigate("/overview")
    } catch {
      navigate("/overview")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLast = currentStep === STEPS.length - 1

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case "welcome":
        return (
          <div className="tour-step">
            <img src={nudgeLogo} alt="Nudge" className="tour-logo" />
            <h2>Welcome to Nudge{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h2>
            <p className="tour-body">
              Behaviour-aware budgeting with timely guidance, not just expense tracking.
            </p>
            <div className="tour-features">
              <div className="tour-feature">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                <span>Smart budget suggestions</span>
              </div>
              <div className="tour-feature">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                <span>Spending profile that learns</span>
              </div>
              <div className="tour-feature">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                <span>Timely nudges and warnings</span>
              </div>
            </div>
            <p className="tour-tip">Tip: You can tag your expenses with a mood too. Totally optional, but it helps us spot emotional spending patterns over time.</p>
          </div>
        )

      case "budget":
        return (
          <div className="tour-step">
            <div className="tour-screenshot-wrap">
              <img src={budgetImg} alt="Budget page preview" className="tour-screenshot" />
            </div>
            <h2>Your Budget</h2>
            <p className="tour-body">
              Add income and expenses to unlock your personalised budget view. The more you track, the smarter it gets.
            </p>
          </div>
        )

      case "persona":
        return (
          <div className="tour-step">
            <div className="tour-screenshot-wrap">
              <img src={personaImg} alt="Persona page preview" className="tour-screenshot" />
            </div>
            <h2>Your Spending Profile</h2>
            <p className="tour-body">
              We analyse your spending to figure out your persona, like whether you're a cautious saver or a weekend splurger. This unlocks after 10 tracked expenses. Confidence improves as you log more over time.
            </p>
          </div>
        )

      case "nudges":
        return (
          <div className="tour-step">
            <div className="tour-screenshot-wrap">
              <img src={nudgeImg} alt="Nudge card preview" className="tour-screenshot" />
            </div>
            <h2>Timely Warnings & Guidance</h2>
            <p className="tour-body">
              You'll get warnings and suggestions based on how you spend. These get more personalised over time.
            </p>
          </div>
        )

      case "plans":
        return (
          <div className="tour-step">
            <div className="tour-screenshot-wrap">
              <img src={plansImg} alt="Plans page preview" className="tour-screenshot" />
            </div>
            <h2>Plans</h2>
            <p className="tour-body">
              Set savings goals or spending priorities in plain English. Optional, but they help shape your budget.
            </p>
            <p className="tour-tip" style={{ marginTop: 16 }}>Got questions about how anything works? You can always ask the AI Assistant.</p>
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
          <div className="tour-actions">
            {currentStep > 0 && (
              <button className="tour-btn-back" onClick={() => setCurrentStep(prev => prev - 1)}>
                Back
              </button>
            )}
            <button className="tour-btn-skip" onClick={finish} disabled={isSubmitting}>
              Skip
            </button>
            <button className="tour-btn-next" onClick={nextStep} disabled={isSubmitting}>
              {isSubmitting ? "Loading..." : isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
