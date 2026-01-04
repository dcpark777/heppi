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

  return (
    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
      {initial}
    </div>
  )
}

export default UserIndicator

