import { useState, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import nudgeLogo from "../assets/nudge logo.PNG"

export default function Navbar() {
  const { user, logout, updateProfile, changePassword } = useAuth()
  const location = useLocation()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPicture, setEditPicture] = useState(null)
  const [previewPicture, setPreviewPicture] = useState(null)
  const fileInputRef = useRef(null)

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const getInitials = (name) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
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

  const handleChangePassword = async () => {
    setPasswordError("")
    setPasswordSuccess("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setIsChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordSuccess("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Failed to change password")
    } finally {
      setIsChangingPassword(false)
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
                  to="/expenses"
                  className={`nav-link ${location.pathname === '/expenses' ? 'active' : ''}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/subscriptions"
                  className={`nav-link ${location.pathname === '/subscriptions' ? 'active' : ''}`}
                >
                  Subscriptions
                </Link>
                <Link
                  to="/chat"
                  className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}
                >
                  AI Assistant
                </Link>
                <div className="profile-wrapper">
                  <button
                    className="profile-avatar"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" />
                    ) : (
                      <span className="avatar-initials">{getInitials(user.name)}</span>
                    )}
                  </button>
                  {showDropdown && (
                    <>
                      <div className="dropdown-overlay" onClick={() => setShowDropdown(false)} />
                      <div className="profile-dropdown">
                        <div className="dropdown-header">
                          <div className="dropdown-avatar">
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt="Profile" />
                            ) : (
                              <span>{getInitials(user.name)}</span>
                            )}
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

      {/* Profile Edit Modal */}
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
                    <span className="preview-initials">{getInitials(editName || user.name)}</span>
                  )}
                </div>
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
                  <h3>Change Password</h3>
                </div>

                {passwordError && (
                  <div className="password-message error">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="password-message success">{passwordSuccess}</div>
                )}

                <div className="profile-form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="profile-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="profile-form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  className="change-password-btn"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </button>
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
