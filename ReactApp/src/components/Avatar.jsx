import "../pages/css/Avatar.css"

export const PERSONA_STYLES = {
  ERRATIC_SPENDER: {
    backgroundColor: "f87171",
    hair: "short04",
    hairColor: "c93305",
    eyes: "variant12",
    mouth: "variant22",
    skinColor: "f2d3b1",
    eyebrows: "variant02",
  },
  CAUTIOUS_SAVER: {
    backgroundColor: "60a5fa",
    hair: "short19",
    hairColor: "2c1b18",
    eyes: "variant17",
    mouth: "variant04",
    skinColor: "ecad80",
    eyebrows: "variant06",
  },
  WEEKEND_SPLURGER: {
    backgroundColor: "fb923c",
    hair: "short11",
    hairColor: "e8e1e1",
    eyes: "variant24",
    mouth: "variant11",
    skinColor: "f2d3b1",
    eyebrows: "variant10",
  },
  BALANCED_SPENDER: {
    backgroundColor: "34d399",
    hair: "short16",
    hairColor: "724133",
    eyes: "variant05",
    mouth: "variant06",
    skinColor: "ae5d29",
    eyebrows: "variant03",
  },
  BIG_SPENDER: {
    backgroundColor: "fbbf24",
    hair: "short08",
    hairColor: "b58143",
    eyes: "variant08",
    mouth: "variant15",
    skinColor: "d08b5b",
    eyebrows: "variant05",
  },
  VOLATILE_SPENDER: {
    backgroundColor: "facc15",
    hair: "short14",
    hairColor: "4a312c",
    eyes: "variant03",
    mouth: "variant09",
    skinColor: "f2d3b1",
    eyebrows: "variant08",
  },
  LATE_NIGHT_SPENDER: {
    backgroundColor: "a78bfa",
    hair: "short01",
    hairColor: "2c1b18",
    eyes: "variant01",
    mouth: "variant01",
    skinColor: "d08b5b",
    eyebrows: "variant12",
  },
  CATEGORY_FOCUSED: {
    backgroundColor: "f472b6",
    hair: "short22",
    hairColor: "6c4545",
    eyes: "variant20",
    mouth: "variant07",
    skinColor: "ecad80",
    eyebrows: "variant09",
  },
}

export function buildDiceBearUrl(userId, personaType, customOptions) {
  const baseStyle = PERSONA_STYLES[personaType] || {}
  const style = customOptions && Object.keys(customOptions).length > 0
    ? { ...baseStyle, ...customOptions }
    : baseStyle

  if (Object.keys(style).length === 0) return null

  const seed = `user_${userId}`
  const params = new URLSearchParams({ seed })

  Object.entries(style).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      params.append(key, value)
    }
  })

  // Ensure probability params are set when accessories are equipped
  if (style.glasses && !style.glassesProbability) {
    params.append("glassesProbability", "100")
  }
  if (style.earrings) {
    params.append("earringsProbability", "100")
  }
  if (style.features) {
    params.append("featuresProbability", "100")
  }

  return `https://api.dicebear.com/9.x/adventurer/svg?${params.toString()}`
}

// === Religious accessory colour options ===

export const HIJAB_COLORS = {
  black: "#1a1a2e",
  navy: "#1e3a5f",
  burgundy: "#722f37",
  forest: "#2d5a27",
  plum: "#5b2c6f",
  teal: "#0e6655",
  dusty_rose: "#c2857a",
  cream: "#f5e6ca",
}

export const KIPPAH_COLORS = {
  black: "#1a1a2e",
  navy: "#1e3a5f",
  white: "#f0f0f0",
  royal_blue: "#1d4ed8",
  burgundy: "#722f37",
  silver: "#c0c0c0",
  cream: "#f5e6ca",
}

export const TURBAN_COLORS = {
  navy: "#1e3a5f",
  black: "#1a1a2e",
  white: "#f0f0f0",
  royal_blue: "#1d4ed8",
  maroon: "#6b1c23",
  orange: "#d97706",
  forest: "#2d5a27",
  cream: "#f5e6ca",
}

export const TAQIYAH_COLORS = {
  white: "#f0f0f0",
  cream: "#f5e6ca",
  black: "#1a1a2e",
  grey: "#6b7280",
  brown: "#78542e",
  navy: "#1e3a5f",
}

export const CROSS_COLORS = {
  gold: "#d4a017",
  silver: "#c0c0c0",
  rose_gold: "#b76e79",
  bronze: "#8c6239",
}

function HijabOverlay({ color }) {
  const fill = HIJAB_COLORS[color] || HIJAB_COLORS.black
  return (
    <svg className="avatar-religious-overlay" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`hijab-grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path
        d={`M50 8 C28 8 14 22 12 38 C10 50 11 56 13 62 C14 66 12 74 10 82 C9 86 12 92 20 92 L35 90 C38 88 42 86 50 86 C58 86 62 88 65 90 L80 92 C88 92 91 86 90 82 C88 74 86 66 87 62 C89 56 90 50 88 38 C86 22 72 8 50 8 Z`}
        fill={`url(#hijab-grad-${color})`}
      />
      <path
        d={`M50 20 C36 20 26 30 24 42 C23 48 24 52 26 56 C28 60 30 64 32 68 C36 72 42 74 50 74 C58 74 64 72 68 68 C70 64 72 60 74 56 C76 52 77 48 76 42 C74 30 64 20 50 20 Z`}
        fill="transparent"
      />
      <path
        d="M30 36 C35 32 42 28 50 28 C58 28 65 32 70 36"
        fill="none" stroke={fill} strokeWidth="0.8" strokeOpacity="0.4"
      />
    </svg>
  )
}

function KippahOverlay({ color }) {
  const fill = KIPPAH_COLORS[color] || KIPPAH_COLORS.black
  return (
    <svg className="avatar-religious-overlay" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`kippah-grad-${color}`} cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.9" />
        </radialGradient>
      </defs>
      {/* Kippah dome sitting on top-back of head */}
      <ellipse cx="50" cy="18" rx="16" ry="8" fill={`url(#kippah-grad-${color})`} />
      {/* Subtle rim */}
      <ellipse cx="50" cy="18" rx="16" ry="8"
        fill="none" stroke={fill} strokeWidth="0.6" strokeOpacity="0.5" />
      {/* Texture lines */}
      <path d="M38 17 Q44 13 50 14 Q56 13 62 17" fill="none" stroke={fill} strokeWidth="0.4" strokeOpacity="0.3" />
      <path d="M40 19 Q45 16 50 16.5 Q55 16 60 19" fill="none" stroke={fill} strokeWidth="0.4" strokeOpacity="0.3" />
    </svg>
  )
}

function TurbanOverlay({ color }) {
  const fill = TURBAN_COLORS[color] || TURBAN_COLORS.navy
  const darkerFill = fill + "cc"
  return (
    <svg className="avatar-religious-overlay" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`turban-grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.88" />
        </linearGradient>
      </defs>
      {/* Main turban wrap covering the top of the head */}
      <path
        d={`M50 6 C30 6 18 16 16 28 C14 38 16 42 20 44 C22 45 24 44 26 42 C28 38 34 34 50 34 C66 34 72 38 74 42 C76 44 78 45 80 44 C84 42 86 38 84 28 C82 16 70 6 50 6 Z`}
        fill={`url(#turban-grad-${color})`}
      />
      {/* Wrap fold lines */}
      <path d="M28 20 Q38 14 50 14 Q62 14 72 20" fill="none" stroke={darkerFill} strokeWidth="0.8" strokeOpacity="0.35" />
      <path d="M24 28 Q36 22 50 22 Q64 22 76 28" fill="none" stroke={darkerFill} strokeWidth="0.8" strokeOpacity="0.35" />
      <path d="M26 36 Q38 30 50 30 Q62 30 74 36" fill="none" stroke={darkerFill} strokeWidth="0.7" strokeOpacity="0.3" />
      {/* Central front piece */}
      <path
        d={`M44 12 Q47 8 50 8 Q53 8 56 12 Q54 18 50 20 Q46 18 44 12 Z`}
        fill={fill} fillOpacity="0.95" stroke={darkerFill} strokeWidth="0.5" strokeOpacity="0.3"
      />
    </svg>
  )
}

function TaqiyahOverlay({ color }) {
  const fill = TAQIYAH_COLORS[color] || TAQIYAH_COLORS.white
  return (
    <svg className="avatar-religious-overlay" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`taqiyah-grad-${color}`} cx="50%" cy="70%" r="55%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.9" />
        </radialGradient>
      </defs>
      {/* Taqiyah rounded cap */}
      <path
        d={`M30 26 C30 12 38 6 50 6 C62 6 70 12 70 26 C70 30 66 32 50 32 C34 32 30 30 30 26 Z`}
        fill={`url(#taqiyah-grad-${color})`}
      />
      {/* Bottom rim */}
      <path d="M30 26 Q40 32 50 32 Q60 32 70 26"
        fill="none" stroke={fill} strokeWidth="1.2" strokeOpacity="0.5" />
      {/* Embroidery pattern lines */}
      <path d="M36 18 Q43 12 50 12 Q57 12 64 18" fill="none" stroke={fill} strokeWidth="0.5" strokeOpacity="0.35" />
      <path d="M34 22 Q42 16 50 16 Q58 16 66 22" fill="none" stroke={fill} strokeWidth="0.5" strokeOpacity="0.35" />
    </svg>
  )
}

function CrossNecklaceOverlay({ color }) {
  const fill = CROSS_COLORS[color] || CROSS_COLORS.gold
  return (
    <svg className="avatar-religious-overlay" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`cross-grad-${color}`} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {/* Chain */}
      <path
        d="M36 72 Q40 68 44 70 Q47 72 50 74 Q53 72 56 70 Q60 68 64 72"
        fill="none" stroke={fill} strokeWidth="0.7" strokeOpacity="0.7"
      />
      {/* Cross pendant */}
      <rect x="48.5" y="74" width="3" height="10" rx="0.5" fill={`url(#cross-grad-${color})`} />
      <rect x="45.5" y="77" width="9" height="3" rx="0.5" fill={`url(#cross-grad-${color})`} />
      {/* Subtle shine */}
      <line x1="49" y1="75" x2="49" y2="78" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" />
    </svg>
  )
}

function getInitials(name) {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function Avatar({ user, size = "md", persona, customOptions = null, frame = null }) {
  const sizeClass = `avatar-${size}`
  const frameClass = frame ? `avatar-frame-${frame}` : ""

  // Priority 1: Uploaded profile picture
  if (user?.profilePicture) {
    return (
      <div className={`avatar-component ${sizeClass} ${frameClass}`}>
        <img src={user.profilePicture} alt={user.name || "Profile"} />
      </div>
    )
  }

  // Priority 2: DiceBear persona avatar
  if (persona) {
    const diceBearOverrides = customOptions ? { ...customOptions } : null

    // Extract religious accessory keys before building URL
    const hijabColor = diceBearOverrides?.hijab
    const kippahColor = diceBearOverrides?.kippah
    const turbanColor = diceBearOverrides?.turban
    const taqiyahColor = diceBearOverrides?.taqiyah
    const crossColor = diceBearOverrides?.crossNecklace

    if (diceBearOverrides) {
      // Hijab and turban hide hair
      if (hijabColor || turbanColor) {
        diceBearOverrides.hairProbability = "0"
      }
      // Remove custom keys that aren't DiceBear params
      delete diceBearOverrides.hijab
      delete diceBearOverrides.kippah
      delete diceBearOverrides.turban
      delete diceBearOverrides.taqiyah
      delete diceBearOverrides.crossNecklace
    }

    const url = buildDiceBearUrl(user?.id, persona, diceBearOverrides)
    if (url) {
      return (
        <div className={`avatar-component ${sizeClass} ${frameClass}`}>
          <img
            className="avatar-dicebear"
            src={url}
            alt={`${persona} avatar`}
          />
          {hijabColor && <HijabOverlay color={hijabColor} />}
          {kippahColor && <KippahOverlay color={kippahColor} />}
          {turbanColor && <TurbanOverlay color={turbanColor} />}
          {taqiyahColor && <TaqiyahOverlay color={taqiyahColor} />}
          {crossColor && <CrossNecklaceOverlay color={crossColor} />}
        </div>
      )
    }
  }

  // Priority 3: Initials fallback
  return (
    <div className={`avatar-component ${sizeClass} ${frameClass}`}>
      <span className="avatar-initials-inner">{getInitials(user?.name)}</span>
    </div>
  )
}
