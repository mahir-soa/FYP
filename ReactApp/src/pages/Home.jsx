import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import "./css/Home.css"

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="home">
      <Navbar />

      <main className="main-content">
        <section className="hero">
          <div className="hero-badge">Smart Financial Companion</div>
          <h1 className="hero-title">
            Your Gentle Push Towards
            <span className="gradient-text"> Better Habits</span>
          </h1>
          <p className="hero-desc">
            Track spending, build better habits, and get AI-powered insights that
            nudge you towards smarter financial decisions.
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
            <h2>Small nudges, big changes</h2>
            <p>Tools designed to gently guide you towards better financial habits.</p>
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
              <h2>Ready to get nudged?</h2>
              <p>Join thousands of users building better financial habits every day.</p>
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
            <span className="logo-icon">N</span>
            <span>Nudge</span>
          </div>
          <p>Your personal finance companion</p>
        </div>
      </footer>
    </div>
  )
}
