import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import "./css/Register.css"

export default function VerifyOtp() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef([])
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyOtp, resendOtp } = useAuth()

  const email = location.state?.email

  useEffect(() => {
    if (!email) {
      navigate("/register")
    }
  }, [email, navigate])

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)

    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex].focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const otpString = otp.join("")
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    setLoading(true)

    try {
      await verifyOtp(email, otpString)
      setSuccess(true)
      setTimeout(() => {
        navigate("/")
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError("")
    try {
      await resendOtp(email)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0].focus()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="success-icon">✓</div>
          <h2>Welcome!</h2>
          <p className="auth-subtitle">
            Your account has been created successfully.
          </p>
          <p className="auth-info">
            Signing you in...
          </p>
        </div>
      </div>
    )
  }

  if (!email) {
    return null
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="success-icon">🔐</div>
        <h2>Enter Verification Code</h2>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="otp-input-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="otp-input"
              />
            ))}
          </div>

          <p className="auth-info" style={{ marginTop: "16px" }}>
            Code expires in 10 minutes
          </p>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Create Account"}
          </button>
        </form>

        <button
          onClick={handleResend}
          className="auth-btn secondary"
          disabled={resending}
          style={{ marginTop: "12px" }}
        >
          {resending ? "Sending..." : "Resend Code"}
        </button>

        <p className="auth-footer">
          <Link to="/register">← Back to Registration</Link>
        </p>
      </div>

      <style>{`
        .otp-input-container {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin: 24px 0;
        }
        .otp-input {
          width: 50px;
          height: 60px;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          transition: all 0.25s ease;
        }
        .otp-input:focus {
          outline: none;
          border-color: #16a34a;
          background: white;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1);
        }
        .success-icon {
          font-size: 64px;
          text-align: center;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  )
}
