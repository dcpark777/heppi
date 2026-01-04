import { useState, useEffect } from 'react'

function UserIndicator() {
  const [username, setUsername] = useState(null)

  useEffect(() => {
    // Get username from sessionStorage
    const storedUsername = sessionStorage.getItem('sydplove_username')
    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [])

  if (!username) {
    return null
  }

  // Get first letter and capitalize
  const initial = username.charAt(0).toUpperCase()
  const displayName = username.charAt(0).toUpperCase() + username.slice(1)

  return (
    <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2">
      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
        {initial}
      </div>
      <span className="text-white text-sm font-medium">{displayName}</span>
    </div>
  )
}

export default UserIndicator

