import { useState } from 'react'
import ChristmasTree from './ChristmasTree'

function Home({ supabase, session }) {
  const [showLogout, setShowLogout] = useState(false)

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center justify-start py-4 px-4">
      <header className="text-center mb-8 w-full z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white drop-shadow-[0_0_20px_rgba(245,224,163,0.5)]">
          🎄 Heppi
        </h1>
        <p className="text-gray-400 text-sm md:text-base">A Christmas Blog</p>
        {session && (
          <div className="mt-4 relative inline-block">
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
        )}
      </header>

      <main className="flex-1 flex items-center justify-center w-full max-w-full">
        <div className="w-full flex justify-center">
          <ChristmasTree />
        </div>
      </main>
    </div>
  )
}

export default Home

