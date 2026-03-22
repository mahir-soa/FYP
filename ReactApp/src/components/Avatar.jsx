import "../pages/css/Avatar.css"

function getInitials(name) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function Avatar({ user, size = "md" }) {
  const sizeClass = `avatar-${size}`

  if (user?.profilePicture) {
    return (
      <div className={`avatar-component ${sizeClass}`}>
        <img src={user.profilePicture} alt={user.name || "Profile"} />
      </div>
    )
  }

  return (
    <div className={`avatar-component ${sizeClass}`}>
      <span className="avatar-initials-inner">{getInitials(user?.name)}</span>
    </div>
  )
}
