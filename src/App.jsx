import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Login from './components/Login'
import Home from './components/Home'
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

  // If Supabase is not configured, show the app without auth
  if (!supabase) {
    return <Home />
  }

  // If user is not authenticated, show login
  if (!session) {
    return <Login supabase={supabase} />
  }

  // User is authenticated, show the app
  return <Home supabase={supabase} session={session} />
}

export default App

