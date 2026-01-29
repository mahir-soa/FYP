import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import "./css/Login.css"

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("verifying")
  const [error, setError] = useState("")
  const { verifyEmail } = useAuth()

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      setError("Invalid verification link")
      return
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error")
        setError(err.response?.data?.message || "Verification failed")
      })
  }, [searchParams, verifyEmail])

  return (
    <div className="auth-container">
      <div className="auth-card">
        {status === "verifying" && (
          <>
            <div className="success-icon">⏳</div>
            <h2>Verifying Email</h2>
            <p className="auth-subtitle">Please wait while we verify your email...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="success-icon">✓</div>
            <h2>Email Verified</h2>
            <p className="auth-subtitle">
              Your email has been verified successfully!
            </p>
            <Link to="/login" className="auth-btn">
              Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="success-icon error">✕</div>
            <h2>Verification Failed</h2>
            <p className="auth-subtitle">{error}</p>
            <p className="auth-info">
              The link may have expired or already been used.
            </p>
            <Link to="/register" className="auth-btn secondary">
              Try Again
            </Link>
            <p className="auth-footer">
              <Link to="/login">Back to Sign In</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
