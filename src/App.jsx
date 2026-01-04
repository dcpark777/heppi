import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Holidays from './components/Holidays'
import Bingo from './components/Bingo'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

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

