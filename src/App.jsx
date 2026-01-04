import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import Login from './components/Login'
import Home from './components/Home'
import Holidays from './components/Holidays'
import Bingo from './components/Bingo'
import './App.css'

// Initialize Supabase client
// These will be set via environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e13] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/holidays" 
          element={
            !supabase ? (
              <Holidays />
            ) : !session ? (
              <Login supabase={supabase} />
            ) : (
              <Holidays supabase={supabase} session={session} />
            )
          } 
        />
        <Route path="/bingo" element={<Bingo />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

