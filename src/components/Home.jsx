import { Link } from 'react-router-dom'
import UserIndicator from './UserIndicator'

function Home() {
  const handleLogout = () => {
    sessionStorage.removeItem('sydplove_authenticated')
    sessionStorage.removeItem('sydplove_username')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4 z-20">
        <UserIndicator onLogout={handleLogout} />
      </div>
      <div className="text-center text-white">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">SY x DP</h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">🖤 🤍</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/holidays"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            Holidays
          </Link>
          <Link
            to="/bingo"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            Bingo Card
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
