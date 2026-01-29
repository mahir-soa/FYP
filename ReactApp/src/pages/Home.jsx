import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import "./css/Home.css"

export default function Home() {
  const { user, logout } = useAuth()

  return (
    <div className="home">
      <div className="home-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <span className="logo-icon">£</span>
            <span className="logo-text">ExpenseTracker</span>
          </Link>
          <div className="nav-right">
            {user ? (
              <>
                <span className="welcome-text">Welcome, {user.name?.split(' ')[0]}</span>
                <Link to="/expenses" className="nav-link">Dashboard</Link>
                <Link to="/chat" className="nav-link">AI Assistant</Link>
                <button onClick={logout} className="btn btn-outline">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Sign In</Link>
                <Link to="/register" className="btn btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <section className="hero">
          <div className="hero-badge">Smart Finance Management</div>
          <h1 className="hero-title">
            Take Control of Your
            <span className="gradient-text"> Finances</span>
          </h1>
          <p className="hero-desc">
            Track expenses effortlessly, get AI-powered insights, and make smarter
            financial decisions. Your personal finance assistant is here.
          </p>
          <div className="hero-buttons">
            {user ? (
              <>
                <Link to="/expenses" className="btn btn-primary btn-lg">
                  <span>Go to Dashboard</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <Link to="/chat" className="btn btn-glass btn-lg">
                  <span>Chat with AI</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  <span>Start Free</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <Link to="/login" className="btn btn-glass btn-lg">
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">10k+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">£2M+</span>
              <span className="stat-label">Tracked</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">4.9</span>
              <span className="stat-label">User Rating</span>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2>Everything you need to manage money</h2>
            <p>Powerful tools designed to help you understand and improve your spending habits.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Expense Tracking</h3>
              <p>Log and categorize your daily expenses with just a few taps. Stay on top of where your money goes.</p>
            </div>
            <div className="feature-card featured">
              <div className="featured-badge">Popular</div>
              <div className="feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3>AI Financial Assistant</h3>
              <p>Get personalized advice and insights from our AI chatbot that understands your spending patterns.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3>TfL Integration</h3>
              <p>Automatic fare calculation for London transport. Just select your zones and we'll do the rest.</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Ready to start saving?</h2>
              <p>Join thousands of users who are already managing their finances smarter.</p>
            </div>
            <Link to={user ? "/expenses" : "/register"} className="btn btn-white btn-lg">
              {user ? "Go to Dashboard" : "Get Started Free"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-icon">£</span>
            <span>ExpenseTracker</span>
          </div>
          <p>Made with care for better financial decisions</p>
        </div>
      </footer>
    </div>
  )
}
