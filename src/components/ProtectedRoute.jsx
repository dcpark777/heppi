import { useState, useEffect } from 'react'
import PasswordAuth from './PasswordAuth'

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated with valid username
    const authenticated = sessionStorage.getItem('sydplove_authenticated') === 'true'
    const username = sessionStorage.getItem('sydplove_username')
    const validUsers = ['sarah', 'dan']
    
    // User must be authenticated and have a valid username
    const isValid = authenticated && username && validUsers.includes(username.toLowerCase())
    setIsAuthenticated(isValid)
    setChecking(false)
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0e13] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <PasswordAuth onSuccess={handleAuthSuccess} />
  }

  return children
}

export default ProtectedRoute

