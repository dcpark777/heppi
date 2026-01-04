import { useState, useEffect, useRef } from 'react'

function UserIndicator({ onLogout }) {
  const [username, setUsername] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    // Get username from sessionStorage
    const storedUsername = sessionStorage.getItem('sydplove_username')
    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  if (!username) {
    return null
  }

  // Get first letter and capitalize
  const initial = username.charAt(0).toUpperCase()
  const displayName = username.charAt(0).toUpperCase() + username.slice(1)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      // Default logout behavior
      sessionStorage.removeItem('sydplove_authenticated')
      sessionStorage.removeItem('sydplove_username')
      window.location.href = '/'
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold hover:bg-blue-700 transition-colors touch-manipulation"
        aria-label="User menu"
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {initial}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-lg overflow-hidden min-w-[150px] z-30">
          {/* Username */}
          <div className="px-4 py-2 text-sm text-white border-b border-gray-800">
            {displayName}
          </div>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default UserIndicator

