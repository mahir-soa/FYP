import { useState, useRef, useEffect, useCallback } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/api"
import Avatar from "./Avatar"
import nudgeLogo from "../assets/nudge logo.PNG"

export default function Navbar() {
  const { user, logout, updateProfile, changePassword, setPasswordForGoogle, deleteAccount } = useAuth()
  const location = useLocation()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPicture, setEditPicture] = useState(null)
  const [previewPicture, setPreviewPicture] = useState(null)
  const fileInputRef = useRef(null)

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false)
  const [nudges, setNudges] = useState([])
  const [nudgeLoading, setNudgeLoading] = useState(false)
  const dismissedRef = useRef(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dismissedNudges") || "[]")
      return new Set(saved)
    } catch { return new Set() }
  })
  // Initialize ref on first render
  if (typeof dismissedRef.current === "function") {
    dismissedRef.current = dismissedRef.current()
  }
  const notifRef = useRef(null)

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const [upcomingSubs, setUpcomingSubs] = useState([])

  const fetchNudges = useCallback(async () => {
    if (!user?.id) return
    setNudgeLoading(true)
    try {
      const [nudgeRes, subsRes] = await Promise.all([
        api.get(`/ml/nudges/${user.id}`),
        api.get(`/subscriptions?userId=${user.id}`).catch(() => ({ data: [] }))
      ])
      const all = nudgeRes.data.nudges || []
      setNudges(all.filter(n => !dismissedRef.current.has(n.id)))

      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const upcoming = (subsRes.data || [])
        .filter(s => s.status === "ACTIVE" && s.nextPaymentDate)
        .map(s => {
          const d = new Date(s.nextPaymentDate)
          d.setHours(0, 0, 0, 0)
          const days = Math.ceil((d - now) / 86400000)
          return { ...s, daysUntil: days }
        })
        .filter(s => s.daysUntil >= 0 && s.daysUntil <= 7 && !dismissedRef.current.has(`sub_${s.id}`))
        .sort((a, b) => a.daysUntil - b.daysUntil)
      setUpcomingSubs(upcoming)
    } catch {
      setNudges([])
      setUpcomingSubs([])
    } finally {
      setNudgeLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchNudges()
    const interval = setInterval(fetchNudges, 60000)
    return () => clearInterval(interval)
  }, [fetchNudges])

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showNotifications])

  const unreadCount = nudges.filter(n => !n.is_read).length + upcomingSubs.length

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH": return "var(--red-500)"
      case "MEDIUM": return "var(--emerald-500)"
      default: return "var(--gray-400)"
    }
  }

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const saveDismissed = () => {
    localStorage.setItem("dismissedNudges", JSON.stringify([...dismissedRef.current]))
  }

  const handleClearNudges = () => {
    nudges.forEach(n => dismissedRef.current.add(n.id))
    saveDismissed()
    setNudges([])
  }

  const handleDismissNudge = (nudgeId) => {
    dismissedRef.current.add(nudgeId)
    saveDismissed()
    setNudges(prev => prev.filter(n => n.id !== nudgeId))
  }

  const handleDismissSub = (subId) => {
    dismissedRef.current.add(`sub_${subId}`)
    saveDismissed()
    setUpcomingSubs(prev => prev.filter(s => s.id !== subId))
  }

  const openProfileModal = () => {
    setEditName(user.name || "")
    setEditPicture(user.profilePicture || null)
    setPreviewPicture(user.profilePicture || null)
    setShowDropdown(false)
    setShowProfileModal(true)
  }

  const closeProfileModal = () => {
    setShowProfileModal(false)
    setEditName("")
    setEditPicture(null)
    setPreviewPicture(null)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError("")
    setPasswordSuccess("")
    setShowDeleteConfirm(false)
    setDeletePassword("")
    setDeleteError("")
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewPicture(reader.result)
        setEditPicture(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePicture = () => {
    setPreviewPicture(null)
    setEditPicture(null)
  }

  const handleSaveProfile = () => {
    updateProfile({
      name: editName.trim() || user.name,
      profilePicture: editPicture
    })
    closeProfileModal()
  }

  const isGoogleUser = user?.isGoogleUser

  const handleChangePassword = async () => {
    setPasswordError("")
    setPasswordSuccess("")

    if (isGoogleUser) {
      if (!newPassword || !confirmPassword) {
        setPasswordError("Both password fields are required")
        return
      }
    } else {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError("All password fields are required")
        return
      }
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    setIsChangingPassword(true)
    try {
      if (isGoogleUser) {
        await setPasswordForGoogle(newPassword)
        setPasswordSuccess("Password set successfully! You can now log in with email and password too.")
      } else {
        await changePassword(currentPassword, newPassword)
        setPasswordSuccess("Password changed successfully")
      }
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Failed to update password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError("")

    if (!deletePassword) {
      setDeleteError("Password is required")
      return
    }

    setIsDeleting(true)
    try {
      await deleteAccount(deletePassword)
      closeProfileModal()
    } catch (error) {
      setDeleteError(error.response?.data?.message || "Failed to delete account")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <img src={nudgeLogo} alt="Nudge" className="logo-img" />
          </Link>
          <div className="nav-right">
            {user ? (
              <>
                <Link
                  to="/overview"
                  className={`nav-link ${location.pathname === '/overview' ? 'active' : ''}`}
                >
                  Overview
                </Link>
                <Link
                  to="/expenses"
                  className={`nav-link ${location.pathname === '/expenses' ? 'active' : ''}`}
                >
                  Expenses
                </Link>
                <Link
                  to="/income"
                  className={`nav-link ${location.pathname === '/income' ? 'active' : ''}`}
                >
                  Income
                </Link>
                <Link
                  to="/budget"
                  className={`nav-link ${location.pathname === '/budget' ? 'active' : ''}`}
                >
                  Budget
                </Link>
                <div className="nav-dropdown">
                  <button className={`nav-link nav-dropdown-trigger ${['/subscriptions', '/bills', '/plans', '/chat'].includes(location.pathname) ? 'active' : ''}`}>
                    More
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  <div className="nav-dropdown-menu">
                    <Link to="/subscriptions" className={`nav-dropdown-item ${location.pathname === '/subscriptions' ? 'active' : ''}`}>
                      Subscriptions
                    </Link>
                    <Link to="/bills" className={`nav-dropdown-item ${location.pathname === '/bills' ? 'active' : ''}`}>
                      Bills & Utilities
                    </Link>
                    <Link to="/plans" className={`nav-dropdown-item ${location.pathname === '/plans' ? 'active' : ''}`}>
                      Plans
                    </Link>
                    <Link to="/chat" className={`nav-dropdown-item ${location.pathname === '/chat' ? 'active' : ''}`}>
                      AI Assistant
                    </Link>
                  </div>
                </div>
                <div className="nav-divider" />
                <div className="notif-wrapper" ref={notifRef}>
                  <button
                    className="notif-bell-btn"
                    onClick={() => setShowNotifications(!showNotifications)}
                    aria-label="Notifications"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {unreadCount > 0 && (
                      <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="notif-dropdown">
                      <div className="notif-dropdown-header">
                        <h3>Nudges</h3>
                        <div className="notif-header-actions">
                          <span className="notif-count">{nudges.length} notification{nudges.length !== 1 ? "s" : ""}</span>
                          {nudges.length > 0 && (
                            <button className="notif-clear-btn" onClick={handleClearNudges}>
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="notif-dropdown-body">
                        {nudgeLoading ? (
                          <div className="notif-empty">Loading...</div>
                        ) : (
                          <>
                          {nudges.slice(0, 10).map((nudge) => (
                            <div
                              key={nudge.id}
                              className={`notif-item ${!nudge.is_read ? "unread" : ""}`}
                            >
                              <div className="notif-item-indicator" style={{ background: getPriorityColor(nudge.priority) }} />
                              <div className="notif-item-content">
                                <div className="notif-item-top">
                                  <div className="notif-item-title">{nudge.title}</div>
                                  <button
                                    className="notif-dismiss-btn"
                                    onClick={() => handleDismissNudge(nudge.id)}
                                    aria-label="Dismiss"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="18" y1="6" x2="6" y2="18"/>
                                      <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                  </button>
                                </div>
                                <div className="notif-item-message">{nudge.message}</div>
                                <div className="notif-item-meta">
                                  <span className={`notif-priority ${nudge.priority?.toLowerCase()}`}>{nudge.priority}</span>
                                  <span className="notif-time">{getTimeAgo(nudge.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        {upcomingSubs.length > 0 && (
                          <>
                            <div className="notif-section-label">Upcoming Charges</div>
                            {upcomingSubs.map(sub => (
                              <div key={sub.id} className="notif-item">
                                <div className="notif-item-indicator" style={{ background: sub.daysUntil <= 1 ? "var(--red-500)" : "#f59e0b" }} />
                                <div className="notif-item-content">
                                  <div className="notif-item-top">
                                    <div className="notif-item-title">{sub.name}</div>
                                    <button
                                      className="notif-dismiss-btn"
                                      onClick={() => handleDismissSub(sub.id)}
                                      aria-label="Dismiss"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="notif-item-message">
                                    £{(sub.cost || 0).toFixed(2)} · {sub.daysUntil === 0 ? "Due today" : sub.daysUntil === 1 ? "Due tomorrow" : `In ${sub.daysUntil} days`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                        {nudges.length === 0 && upcomingSubs.length === 0 && (
                          <div className="notif-empty">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            <p>Nothing right now</p>
                          </div>
                        )}
                        </>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                <div className="profile-wrapper">
                  <button
                    className="profile-avatar"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <Avatar user={user} size="md" />
                  </button>
                  {showDropdown && (
                    <>
                      <div className="dropdown-overlay" onClick={() => setShowDropdown(false)} />
                      <div className="profile-dropdown">
                        <div className="dropdown-header">
                          <div className="dropdown-avatar">
                            <Avatar user={user} size="lg" />
                          </div>
                          <div className="dropdown-info">
                            <span className="dropdown-name">{user.name}</span>
                            <span className="dropdown-email">{user.email}</span>
                          </div>
                        </div>
                        <div className="dropdown-divider" />
                        <button className="dropdown-item" onClick={openProfileModal}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          Edit Profile
                        </button>
                        <Link
                          className="dropdown-item"
                          to="/persona"
                          onClick={() => setShowDropdown(false)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                            <path d="M12 2a7 7 0 0 1 7 7h-7V2z"/>
                          </svg>
                          My Persona
                        </Link>
                        <div className="dropdown-divider" />
                        <button className="dropdown-item logout" onClick={logout}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                          </svg>
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Sign In</Link>
                <Link to="/register" className="nav-btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {showProfileModal && (
        <div className="profile-modal-overlay" onClick={closeProfileModal}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Edit Profile</h2>
              <button className="modal-close-btn" onClick={closeProfileModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="profile-modal-body">
              <div className="profile-picture-section">
                <div className="profile-picture-preview">
                  {previewPicture ? (
                    <img src={previewPicture} alt="Profile preview" />
                  ) : (
                    <Avatar user={{ ...user, name: editName || user.name, profilePicture: null }} size="xl" />
                  )}
                </div>
                {user.persona && (
                  <div className="persona-badge">
                    <span className="persona-badge-dot" />
                    {user.persona.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                )}
                <div className="profile-picture-actions">
                  <button
                    className="picture-action-btn upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload Photo
                  </button>
                  {previewPicture && (
                    <button
                      className="picture-action-btn remove"
                      onClick={handleRemovePicture}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>

              <div className="profile-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="profile-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="disabled"
                />
                <span className="form-hint">Email cannot be changed</span>
              </div>

              <div className="password-section">
                <div className="password-section-header">
                  <h3>{isGoogleUser ? "Set a Password" : "Change Password"}</h3>
                </div>

                {isGoogleUser && (
                  <p className="form-hint" style={{ marginBottom: 12 }}>
                    You signed in with Google. Set a password to also log in with email and password.
                  </p>
                )}

                {passwordError && (
                  <div className="password-message error">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="password-message success">{passwordSuccess}</div>
                )}

                {!isGoogleUser && (
                  <div className="profile-form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                )}

                <div className="profile-form-group">
                  <label>{isGoogleUser ? "Password" : "New Password"}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={isGoogleUser ? "Choose a password" : "Enter new password"}
                  />
                </div>

                <div className="profile-form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                  />
                </div>

                <button
                  className="change-password-btn"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? "Saving..." : isGoogleUser ? "Set Password" : "Change Password"}
                </button>
              </div>

              <div className="delete-account-section">
                {!showDeleteConfirm ? (
                  <button
                    className="delete-account-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Delete Account
                  </button>
                ) : (
                  <div className="delete-confirm-box">
                    <p className="delete-warning">
                      This action cannot be undone. All your data will be permanently deleted.
                    </p>

                    {deleteError && (
                      <div className="delete-error">{deleteError}</div>
                    )}

                    <div className="profile-form-group">
                      <label>Enter your password to confirm</label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                      />
                    </div>

                    <div className="delete-confirm-actions">
                      <button
                        className="delete-cancel-btn"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeletePassword("")
                          setDeleteError("")
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="delete-confirm-btn"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete My Account"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-modal-footer">
              <button className="modal-btn cancel" onClick={closeProfileModal}>
                Cancel
              </button>
              <button className="modal-btn save" onClick={handleSaveProfile}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
