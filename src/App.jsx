import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import SplashScreen from './pages/SplashScreen'
import Login from './pages/Login'
import Register from './pages/Register'
import Patrimoine from './pages/Patrimoine'
import Saisie from './pages/Saisie'
import Historique from './pages/Historique'
import Pea from './pages/PEA'
import AjouterOrdre from './pages/AjouterOrdre'
import CarnetOrdres from './pages/CarnetOrdres'


export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!session ? <SplashScreen /> : <Navigate to="/patrimoine" />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/patrimoine" />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/patrimoine" />} />
        <Route path="/patrimoine" element={session ? <Patrimoine /> : <Navigate to="/" />} />
        <Route path="/saisie" element={session ? <Saisie /> : <Navigate to="/" />} />
        <Route path="/historique" element={session ? <Historique /> : <Navigate to="/" />} />
        <Route path="/pea" element={session ? <Pea /> : <Navigate to="/" />} />
        <Route path="/pea/ajouter" element={session ? <AjouterOrdre /> : <Navigate to="/" />} />
        <Route path="/pea/carnet-ordres" element={session ? <CarnetOrdres /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}