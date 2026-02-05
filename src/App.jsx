import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Holidays from './components/Holidays'
import Christmas2025 from './components/Christmas2025'
import Bingo from './components/Bingo'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

const Valentines2026 = lazy(() => import('./components/Valentines2026'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/holidays" 
          element={
            <ProtectedRoute>
              <Holidays />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/holidays/christmas-2025" 
          element={
            <ProtectedRoute>
              <Christmas2025 />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/holidays/valentines-2026" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen bg-[#0d0508] flex items-center justify-center text-rose-300">Loading…</div>}>
                <Valentines2026 />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/bingo" 
          element={
            <ProtectedRoute>
              <Bingo />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

