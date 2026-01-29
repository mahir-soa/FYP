import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import "./css/Home.css"

export default function Home() {
  const { user, logout } = useAuth()

  return (
    <div className="home-container">
      <nav className="home-nav">
        <div className="nav-brand">ExpenseTracker</div>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">Hello, {user.name}</span>
              <button onClick={logout} className="nav-btn logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn">Sign In</Link>
              <Link to="/register" className="nav-btn primary">Register</Link>
            </>
          )}
        </div>
      </nav>

      <main className="home-main">
        <section className="hero">
          <h1>Track Your Expenses with Ease</h1>
          <p>
            Manage your daily spending, categorize expenses, and get AI-powered
            financial insights all in one place.
          </p>
          {user ? (
            <div className="hero-actions">
              <Link to="/expenses" className="hero-btn primary">
                Go to Expenses
              </Link>
              <Link to="/chat" className="hero-btn secondary">
                Financial Assistant
              </Link>
            </div>
          ) : (
            <div className="hero-actions">
              <Link to="/register" className="hero-btn primary">
                Get Started
              </Link>
              <Link to="/login" className="hero-btn secondary">
                Sign In
              </Link>
            </div>
          )}
        </section>

        <section className="features">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Track Spending</h3>
            <p>Log your daily expenses across multiple categories with ease.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🚇</div>
            <h3>TfL Integration</h3>
            <p>Automatic fare calculation for London transport journeys.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Assistant</h3>
            <p>Get personalized financial advice and spending insights.</p>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>Expense Tracker - Manage your finances smarter</p>
      </footer>
    </div>
  )
}
