import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import nudgeLogo from "../assets/nudge logo.PNG"
import "./css/Login.css"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { forgotPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await forgotPassword(email)
      setEmailSent(true)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="auth-page">
        <div className="auth-logo">
          <img src={nudgeLogo} alt="Nudge" />
        </div>

        <div className="auth-card">
          <div className="success-icon">✉️</div>
          <h2>Check Your Email</h2>
          <p className="auth-subtitle">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="auth-info">
            Click the link in the email to reset your password. The link will expire in 1 hour.
          </p>
          <Link to="/login" className="auth-btn">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <img src={nudgeLogo} alt="Nudge" />
      </div>

      <div className="auth-card">
        <p className="auth-subtitle">Don't worry, it happens</p>
        <h2>Forgot password</h2>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
