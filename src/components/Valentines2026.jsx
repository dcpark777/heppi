import { Link } from 'react-router-dom'
import ILoveYouAnimation from './ILoveYouAnimation'
import UserIndicator from './UserIndicator'

function Valentines2026() {
  const handleLogout = () => {
    sessionStorage.removeItem('sydplove_authenticated')
    sessionStorage.removeItem('sydplove_username')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0d0508] flex flex-col items-center justify-center px-4 relative">
      {/* Back to Holidays button - top left */}
      <Link
        to="/holidays"
        className="absolute top-4 left-4 z-20 bg-gray-600 active:bg-gray-700 text-white font-semibold py-3 px-3 md:py-2 md:px-2 rounded-lg transition-colors text-xl md:text-lg touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
        aria-label="Back to Holidays"
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        ←
      </Link>

      <div className="absolute top-4 right-4 z-20">
        <UserIndicator onLogout={handleLogout} />
      </div>

      <main className="relative z-10 flex flex-col items-center text-center text-white w-full max-w-2xl">
        <ILoveYouAnimation />
      </main>
    </div>
  )
}

export default Valentines2026
