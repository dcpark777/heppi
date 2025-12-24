import { useState } from 'react'
import ChristmasTree from './ChristmasTree'
import Fireworks from './Fireworks'

function Home({ supabase, session }) {
  const [showLogout, setShowLogout] = useState(false)

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center justify-center px-4 relative">
      {/* Fireworks background */}
      <Fireworks />

      {session && (
        <div className="absolute top-4 right-4 z-20">
          <div className="relative">
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              {session.user.email} ▼
            </button>
            {showLogout && (
              <div className="absolute right-0 mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-lg overflow-hidden z-20">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center w-full max-w-full overflow-visible relative z-10">
        <div className="w-full flex justify-center overflow-visible">
          <ChristmasTree />
        </div>
      </main>
    </div>
  )
}

export default Home

