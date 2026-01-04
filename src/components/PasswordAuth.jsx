import { useState } from 'react'

function PasswordAuth({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Get password from environment variable, default to a simple password
  const correctPassword = import.meta.env.VITE_SITE_PASSWORD || 'sydplove'

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simple password check
    if (password === correctPassword) {
      // Store authentication in sessionStorage
      sessionStorage.setItem('sydplove_authenticated', 'true')
      onSuccess()
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">SY x DP</h2>
          <p className="text-gray-400 text-center mb-6">Enter password to continue</p>
          
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              disabled={loading}
            />
            
            {error && (
              <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
            )}
            
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PasswordAuth

