import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg:      '#0B1628',
  blue:    '#2563EB',
  red:     '#DC2626',
  redSoft: 'rgba(220,38,38,0.12)',
  border:  'rgba(255,255,255,0.1)',
  text:    '#FFFFFF',
  textSub: 'rgba(255,255,255,0.5)',
  muted:   'rgba(255,255,255,0.25)',
}

const inputStyle = (focused, error) => ({
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: `1.5px solid ${error ? C.red : focused ? C.blue : C.border}`,
  borderRadius: '12px',
  padding: '14px 16px',
  fontSize: '15px',
  fontWeight: '500',
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color .15s',
  fontFamily: 'Inter, system-ui, sans-serif',
})

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [focused, setFocused] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError('Remplis tous les champs')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (err) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    navigate('/patrimoine')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: C.text,
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{ padding: '52px 24px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: C.blue, fontSize: 24, cursor: 'pointer', padding: 0 }}>
          ‹
        </button>
        <div>
          <div style={{ fontSize: 11, color: C.textSub, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
            Bienvenue
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>Se connecter</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '32px 24px 120px' }}>

        {/* Logo centré */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <svg width="72" height="72" viewBox="0 0 150 150">
            <rect width="150" height="150" rx="36" fill="#1C2B4A"/>
            <polygon points="75,16 128,75 75,134 22,75" fill="none" stroke="#D4A843" strokeWidth="3"/>
            <polygon points="75,34 110,75 75,116 40,75" fill="none" stroke="#D4A843" strokeWidth="1" opacity="0.35"/>
            <polygon points="75,42 108,86 42,86" fill="#2A4A8C"/>
            <polygon points="75,42 108,86 42,86" fill="none" stroke="#4A7FE8" strokeWidth="2.5" strokeLinejoin="round"/>
            <polygon points="50,62 67,86 33,86" fill="#1C2B4A"/>
            <polygon points="50,62 67,86 33,86" fill="none" stroke="#4A7FE8" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M42,86 Q75,72 108,86" fill="none" stroke="#D4A843" strokeWidth="3" strokeLinecap="round"/>
            <line x1="75" y1="78" x2="75" y2="60" stroke="#D4A843" strokeWidth="2" strokeLinecap="round"/>
            <line x1="64" y1="80" x2="58" y2="68" stroke="#D4A843" strokeWidth="2" strokeLinecap="round"/>
            <line x1="86" y1="80" x2="92" y2="68" stroke="#D4A843" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="75" cy="106" r="4" fill="#D4A843" opacity="0.85"/>
          </svg>
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
            Email
          </label>
          <input
            type="email"
            placeholder="max@email.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused('')}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={inputStyle(focused === 'email', false)}
          />
        </div>

        {/* Mot de passe */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
            Mot de passe
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused('')}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={inputStyle(focused === 'password', false)}
          />
        </div>

        {error && (
          <div style={{
            background: C.redSoft,
            border: `1px solid ${C.red}`,
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 13,
            color: C.red,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Sticky bottom */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '16px 24px 36px',
        background: `linear-gradient(to top, ${C.bg} 70%, transparent)`,
      }}>
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? C.muted : C.blue,
            border: 'none',
            borderRadius: 14,
            padding: '17px',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.4)',
            transition: 'all .2s',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: C.textSub }}>
          Pas encore de compte ?{' '}
          <span onClick={() => navigate('/register')}
            style={{ color: C.blue, fontWeight: 600, cursor: 'pointer' }}>
            Créer un compte
          </span>
        </div>
      </div>
    </div>
  )
}
