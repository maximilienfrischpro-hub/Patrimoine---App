import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg:       '#0B1628',
  blue:     '#2563EB',
  red:      '#DC2626',
  redSoft:  'rgba(220,38,38,0.12)',
  green:    '#16A34A',
  border:   'rgba(255,255,255,0.1)',
  text:     '#FFFFFF',
  textSub:  'rgba(255,255,255,0.5)',
  muted:    'rgba(255,255,255,0.25)',
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

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    prenom: '', nom: '', date_naissance: '', email: '',
    password: '', confirm: ''
  })
  const [focused, setFocused] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const validate = () => {
    const e = {}
    if (!form.prenom.trim()) e.prenom = 'Requis'
    if (!form.nom.trim()) e.nom = 'Requis'
    if (!form.date_naissance) e.date_naissance = 'Requis'
    if (!form.email.includes('@')) e.email = 'Email invalide'
    if (form.password.length < 8) e.password = 'Minimum 8 caractères'
    if (form.password !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setServerError('')
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            prenom: form.prenom,
            nom: form.nom,
            date_naissance: form.date_naissance
          }
        }
      })
      if (error) { setServerError(error.message); setLoading(false); return }
      setStep(2)
    } catch (e) {
      setServerError('Une erreur est survenue')
    }
    setLoading(false)
  }

  const label = (text) => (
    <label style={{
      fontSize: 11, fontWeight: 700, color: C.textSub,
      letterSpacing: 1, textTransform: 'uppercase',
      display: 'block', marginBottom: 7
    }}>{text}</label>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: C.text,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '52px 24px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => step === 2 ? setStep(1) : navigate('/')}
          style={{ background: 'none', border: 'none', color: C.blue, fontSize: 24, cursor: 'pointer', padding: 0 }}>
          ‹
        </button>
        <div>
          <div style={{ fontSize: 11, color: C.textSub, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
            {step === 1 ? 'Étape 1 / 2' : 'Étape 2 / 2'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
            {step === 1 ? 'Créer un compte' : 'Vérifie ton email'}
          </div>
        </div>
      </div>

      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', margin: '0 24px' }}>
        <div style={{
          height: '100%',
          width: step === 1 ? '50%' : '100%',
          background: C.blue,
          borderRadius: 2,
          transition: 'width .3s'
        }} />
      </div>

      {step === 1 && (
        <div style={{ flex: 1, padding: '28px 24px 120px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              {label('Prénom')}
              <input placeholder="Max" value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                onFocus={() => setFocused('prenom')} onBlur={() => setFocused('')}
                style={inputStyle(focused === 'prenom', errors.prenom)} />
              {errors.prenom && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{errors.prenom}</div>}
            </div>
            <div style={{ flex: 1 }}>
              {label('Nom')}
              <input placeholder="Dupont" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                onFocus={() => setFocused('nom')} onBlur={() => setFocused('')}
                style={inputStyle(focused === 'nom', errors.nom)} />
              {errors.nom && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{errors.nom}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            {label('Date de naissance')}
            <input type="date" value={form.date_naissance}
              onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))}
              onFocus={() => setFocused('date')} onBlur={() => setFocused('')}
              style={inputStyle(focused === 'date', errors.date_naissance)} />
            {errors.date_naissance && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{errors.date_naissance}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            {label('Email')}
            <input type="email" placeholder="max@email.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
              style={inputStyle(focused === 'email', errors.email)} />
            {errors.email && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{errors.email}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            {label('Mot de passe')}
            <input type="password" placeholder="Minimum 8 caractères" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              style={inputStyle(focused === 'password', errors.password)} />
            {errors.password && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{errors.password}</div>}
          </div>

          <div style={{ marginBottom: 24 }}>
            {label('Confirmer le mot de passe')}
            <input type="password" placeholder="Identique au mot de passe" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              onFocus={() => setFocused('confirm')} onBlur={() => setFocused('')}
              style={inputStyle(focused === 'confirm', errors.confirm)} />
            {errors.confirm && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>✕ {errors.confirm}</div>}
            {form.confirm && form.password === form.confirm && (
              <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>✓ Les mots de passe correspondent</div>
            )}
          </div>

          {serverError && (
            <div style={{ background: C.redSoft, border: `1px solid ${C.red}`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>
              {serverError}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, padding: '60px 24px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>📧</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Confirme ton email</div>
          <div style={{ fontSize: 15, color: C.textSub, marginBottom: 8, lineHeight: 1.6 }}>
            Un lien de confirmation a été envoyé à
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 20px', marginBottom: 32 }}>
            {form.email}
          </div>
          <div style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 14, padding: '20px', maxWidth: 320, marginBottom: 32 }}>
            <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
              📬 Ouvre ton email et clique sur <b style={{ color: C.text }}>"Confirm email address"</b> pour activer ton compte.
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.textSub }}>Tu ne trouves pas l'email ? Vérifie tes spams.</div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px 36px', background: `linear-gradient(to top, ${C.bg} 70%, transparent)` }}>
        {step === 1 ? (
          <>
            <button onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', background: loading ? C.muted : C.blue, border: 'none', borderRadius: 14, padding: '17px', fontSize: 16, fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.4)', transition: 'all .2s', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {loading ? 'Création du compte...' : 'Continuer'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: C.textSub }}>
              Déjà un compte ?{' '}
              <span onClick={() => navigate('/login')} style={{ color: C.blue, fontWeight: 600, cursor: 'pointer' }}>Se connecter</span>
            </div>
          </>
        ) : (
          <button onClick={() => navigate('/login')}
            style={{ width: '100%', background: C.blue, border: 'none', borderRadius: 14, padding: '17px', fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 6px 20px rgba(37,99,235,0.4)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Aller à la connexion
          </button>
        )}
      </div>
    </div>
  )
}
