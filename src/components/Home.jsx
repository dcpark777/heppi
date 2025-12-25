import { useState } from 'react'
import ChristmasTree from './ChristmasTree'
import Fireworks from './Fireworks'
import Snow from './Snow'

function Home({ supabase, session }) {
  const [showLogout, setShowLogout] = useState(false)
  const [snowEnabled, setSnowEnabled] = useState(true)
  const [smokeEnabled, setSmokeEnabled] = useState(true)
  const [treeKey, setTreeKey] = useState(0)
  const [fireworkKey, setFireworkKey] = useState(0)

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center justify-end px-4 relative">
      {/* Snow falling */}
      {snowEnabled && <Snow />}
      
      {/* Fireworks background */}
      <Fireworks key={fireworkKey} smokeEnabled={smokeEnabled} skipInitialDelay={fireworkKey > 0} />

      {/* Top right controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        {/* Firework restart button */}
        <button
          onClick={() => setFireworkKey(prev => prev + 1)}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded text-lg"
          aria-label="Restart firework animation"
          title="Restart firework animation"
        >
          🎆
        </button>

        {/* Tree restart button */}
        <button
          onClick={() => setTreeKey(prev => prev + 1)}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded text-lg"
          aria-label="Restart tree animation"
          title="Restart tree animation"
        >
          🎄
        </button>

        {/* Snow toggle button */}
        <button
          onClick={() => setSnowEnabled(!snowEnabled)}
          className={`text-gray-400 hover:text-white transition-colors p-2 rounded text-lg ${snowEnabled ? 'bg-gray-800/50' : ''}`}
          aria-label={snowEnabled ? "Disable snow" : "Enable snow"}
          title={snowEnabled ? "Disable snow" : "Enable snow"}
        >
          {snowEnabled ? '❄️' : '❄'}
        </button>

        {session && (
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
        )}
      </div>

      <main className="flex items-center justify-center w-full max-w-full overflow-visible relative z-10 pb-4">
        <div className="w-full flex justify-center overflow-visible">
          <ChristmasTree key={treeKey} />
        </div>
      </main>
    </div>
  )
}

export default Home

