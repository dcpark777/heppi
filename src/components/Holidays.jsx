import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import UserIndicator from './UserIndicator'

// Feb 14, 2026 00:00:00 in user's local timezone
const VALENTINES_2026_DATE = new Date(2026, 1, 14)

function formatCountdown(ms) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

function Holidays() {
  const [now, setNow] = useState(() => new Date())
  const isDev = import.meta.env.DEV
  const valentinesAvailable = isDev || now >= VALENTINES_2026_DATE
  const countdown = formatCountdown(VALENTINES_2026_DATE - now)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('sydplove_authenticated')
    sessionStorage.removeItem('sydplove_username')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center justify-center px-4 relative">
      {/* Back to Home button - top left */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-20 bg-gray-600 active:bg-gray-700 text-white font-semibold py-3 px-3 md:py-2 md:px-2 rounded-lg transition-colors text-xl md:text-lg touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
        aria-label="Back to Home"
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        ←
      </Link>

      <div className="absolute top-4 right-4 z-20">
        <UserIndicator onLogout={handleLogout} />
      </div>

      <div className="text-center text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Holidays</h1>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/holidays/christmas-2025"
            className="inline-block bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg flex flex-col items-center gap-2 min-w-[200px]"
          >
            <span className="text-2xl">🎄</span>
            Christmas 2025
          </Link>
          {valentinesAvailable ? (
            <Link
              to="/holidays/valentines-2026"
              className="inline-block bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg flex flex-col items-center gap-2 min-w-[200px]"
            >
              <span className="text-2xl">💕</span>
              Valentine&apos;s Day 2026
            </Link>
          ) : (
            <div
              className="relative inline-block min-w-[200px] rounded-lg overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="bg-rose-900/60 text-white font-semibold py-3 px-8 text-lg flex flex-col items-center gap-2 opacity-80"
                aria-hidden="true"
              >
                <span className="text-2xl">💕</span>
                Valentine&apos;s Day 2026
              </div>
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gray-900/80 backdrop-blur-[2px] text-white py-3 px-3"
                aria-label="Coming soon"
              >
                <span className="text-[9px] font-semibold uppercase tracking-widest text-rose-300/90">
                  Coming soon
                </span>
                <div className="flex gap-1">
                  {[
                    [countdown.days, 'd'],
                    [String(countdown.hours).padStart(2, '0'), 'h'],
                    [String(countdown.minutes).padStart(2, '0'), 'm'],
                    [String(countdown.seconds).padStart(2, '0'), 's']
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="flex flex-col items-center min-w-[1.75rem] py-1 px-0.5 rounded bg-white/10 border border-white/10"
                    >
                      <span className="text-xs font-semibold tabular-nums text-white leading-none">
                        {value}
                      </span>
                      <span className="text-[8px] uppercase text-rose-200/70 leading-tight">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-[9px] text-rose-200/60">
                  Feb 14, 2026
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Holidays
