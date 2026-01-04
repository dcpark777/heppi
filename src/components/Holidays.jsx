import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChristmasTree from './ChristmasTree'
import Fireworks from './Fireworks'
import Snow from './Snow'
import UserIndicator from './UserIndicator'

function Holidays() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [snowEnabled, setSnowEnabled] = useState(true)
  const [smokeEnabled, setSmokeEnabled] = useState(true)
  const [treeKey, setTreeKey] = useState(0)
  const [fireworkKey, setFireworkKey] = useState(0)

  const handleLogout = () => {
    sessionStorage.removeItem('sydplove_authenticated')
    sessionStorage.removeItem('sydplove_username')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center justify-end px-4 relative">
      {/* Snow falling */}
      {snowEnabled && <Snow />}
      
      {/* Fireworks background */}
      <Fireworks key={fireworkKey} smokeEnabled={smokeEnabled} skipInitialDelay={fireworkKey > 0} />

      {/* Top right - User indicator */}
      <div className="absolute top-4 right-4 z-20">
        <UserIndicator />
      </div>

      {/* Top right collapsible menu - positioned below user indicator */}
      <div className="absolute top-20 right-4 z-20">
        {/* Menu toggle button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded text-lg bg-gray-900/50 backdrop-blur-sm"
          aria-label="Toggle menu"
          title="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Collapsible menu */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-lg overflow-hidden min-w-[200px]">
            {/* Back to Home */}
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
            >
              ← Back to Home
            </Link>

            {/* Firework restart */}
            <button
              onClick={() => {
                setFireworkKey(prev => prev + 1)
                setMenuOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
              aria-label="Restart firework animation"
            >
              🎆 Restart Fireworks
            </button>

            {/* Tree restart */}
            <button
              onClick={() => {
                setTreeKey(prev => prev + 1)
                setMenuOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
              aria-label="Restart tree animation"
            >
              🎄 Restart Tree
            </button>

            {/* Snow toggle */}
            <button
              onClick={() => {
                setSnowEnabled(!snowEnabled)
                setMenuOpen(false)
              }}
              className={`block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors ${snowEnabled ? 'bg-gray-800/50' : ''}`}
              aria-label={snowEnabled ? "Disable snow" : "Enable snow"}
            >
              ❄️ Toggle Snow
            </button>

            {/* Logout */}
            <div className="border-t border-gray-800 my-1"></div>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
            >
              Logout
            </button>
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

export default Holidays

