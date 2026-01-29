import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../api/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`
      api.get("/auth/me")
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("token")
          delete api.defaults.headers.common["Authorization"]
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password })
    const { token, user } = res.data
    localStorage.setItem("token", token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
    setUser(user)
    return user
  }

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password })
    return res.data
  }

  const verifyEmail = async (token) => {
    const res = await api.post("/auth/verify-email", { token })
    return res.data
  }

  const resendVerification = async (email) => {
    const res = await api.post("/auth/resend-verification", { email })
    return res.data
  }

  const forgotPassword = async (email) => {
    const res = await api.post("/auth/forgot-password", { email })
    return res.data
  }

  const resetPassword = async (token, password) => {
    const res = await api.post("/auth/reset-password", { token, password })
    return res.data
  }

  const logout = () => {
    localStorage.removeItem("token")
    delete api.defaults.headers.common["Authorization"]
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
