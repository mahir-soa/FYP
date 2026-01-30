import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../api/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const savedProfilePicture = localStorage.getItem("profilePicture")
    const savedUserName = localStorage.getItem("userName")
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`
      api.get("/auth/me")
        .then(res => {
          const userData = res.data
          if (savedProfilePicture) {
            userData.profilePicture = savedProfilePicture
          }
          if (savedUserName) {
            userData.name = savedUserName
          }
          setUser(userData)
        })
        .catch(() => {
          localStorage.removeItem("token")
          localStorage.removeItem("profilePicture")
          localStorage.removeItem("userName")
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

  const verifyOtp = async (email, otp) => {
    const res = await api.post("/auth/verify-otp", { email, otp })
    const { token, user } = res.data
    localStorage.setItem("token", token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
    setUser(user)
    return res.data
  }

  const resendOtp = async (email) => {
    const res = await api.post("/auth/resend-otp", { email })
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

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.post("/auth/change-password", { currentPassword, newPassword })
    return res.data
  }

  const updateProfile = ({ name, profilePicture }) => {
    // Update name
    if (name && name !== user.name) {
      localStorage.setItem("userName", name)
    }

    // Update profile picture
    if (profilePicture) {
      localStorage.setItem("profilePicture", profilePicture)
    } else {
      localStorage.removeItem("profilePicture")
    }

    setUser(prev => ({
      ...prev,
      name: name || prev.name,
      profilePicture: profilePicture || null
    }))
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("profilePicture")
    localStorage.removeItem("userName")
    delete api.defaults.headers.common["Authorization"]
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      verifyOtp,
      resendOtp,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      changePassword,
      updateProfile,
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
