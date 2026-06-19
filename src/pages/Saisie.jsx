import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg:      '#F4F6FB',
  navy:    '#0F1B3C',
  blue:    '#2563EB',
  green:   '#16A34A',
  red:     '#DC2626',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  textSub: '#64748B',
  muted:   '#94A3B8',
}

const COMPTES = [
  { id: 'credit_agricole', label: 'Crédit Agricole', icon: '🏦', group: 'Banque' },
  { id: 'revolut',         label: 'Revolut',          icon: '💳', group: 'Banque' },
  { id: 'fortuneo',        label: 'Fortuneo',          icon: '🏦', group: 'Banque' },
  { id: 'livret_a',        label: 'Livret A',           icon: '💰', group: 'Épargne' },
  { id: 'livret_plus',     label: 'Livret+',            icon: '💰', group: 'Épargne' },
  { id: 'pel',             label: 'PEL',                icon: '🔒', group: 'Épargne' },
  { id: 'pea',             label: 'PEA',                icon: '📈', group: 'Investissement' },
  { id: 'trading',         label: 'Trading',            icon: '📊', group: 'Investissement' },
]

const GROUPS = ['Banque', 'Épargne', 'Investissement']

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

const getYesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

const parseVal = s => {
  if (!s || s === '') return 0
  const n = parseFloat(String(s).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export default function Saisie() {
  const navigate = useNavigate()
  const [date, setDate] = useState(getYesterday())
  const [vals, setVals] = useState({})
  const [focused, setFocused] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const total = COMPTES.reduce((s, c) => s + parseVal(vals[c.id]), 0)

  const handleSave = async () => {
    if (total === 0) { setError('Remplis au moins un champ'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non connecté'); setLoading(false); return }

    const row = {
      user_id: user.id,
      date,
      credit_agricole: parseVal(vals.credit_agricole),
      revolut:         parseVal(vals.revolut),
      fortuneo:        parseVal(vals.fortuneo),
      livret_a:        parseVal(vals.livret_a),
      livret_plus:     parseVal(vals.livret_plus),
      pel:             parseVal(vals.pel),
      pea:             parseVal(vals.pea),
      trading:         parseVal(vals.trading),
      immobilier:      null,
    }

    const { error: err } = await supabase.from('saisies').insert(row)

    if (err) {
      if (err.code === '23505') {
        setError('Une saisie existe déjà pour cette date. Supprime-la depuis l\'historique.')
      } else {
        setError('Erreur : ' + err.message)
      }
      setLoading(false)
      return
    }

    setSaved(true)
    setTimeout(() => navigate('/patrimoine'), 1000)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 430, margin: '0 auto' }}>

      {/* Simple header — light, native style */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '52px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/patrimoine')}
          style={{ background: 'none', border: 'none', color: C.blue, fontSize: 22, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Nouvelle saisie</div>
      </div>

      {/* Form body */}
      <div style={{ padding: '20px 16px 140px' }}>

        {/* Date */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Date
          </label>
          <input type="date" value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 600, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
          />
        </div>

        {/* Compte fields */}
        {GROUPS.map(group => (
          <div key={group} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 }}>
              {group}
            </div>
            <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,27,60,.06)' }}>
              {COMPTES.filter(c => c.group === group).map((c, i, arr) => {
                const isFocused = focused === c.id
                const isLast = i === arr.length - 1
                return (
                  <div key={c.id} style={{ borderBottom: isLast ? 'none' : `1px solid ${C.border}`, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 20, width: 28, flexShrink: 0 }}>{c.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{c.label}</div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={vals[c.id] || ''}
                            onFocus={() => setFocused(c.id)}
                            onBlur={() => setFocused('')}
                            onChange={e => {
                              const v = e.target.value
                              // Accepte chiffres, une seule virgule ou point
                              if (/^[0-9]*[.,]?[0-9]*$/.test(v)) {
                                setVals(vv => ({ ...vv, [c.id]: v }))
                              }
                            }}
                            style={{
                              width: '100%',
                              background: isFocused ? '#EEF3FF' : C.bg,
                              border: `1.5px solid ${isFocused ? C.blue : 'transparent'}`,
                              borderRadius: 10,
                              padding: '10px 40px 10px 14px',
                              fontSize: 16,
                              fontWeight: 700,
                              color: C.text,
                              outline: 'none',
                              boxSizing: 'border-box',
                              transition: 'all .15s',
                              WebkitAppearance: 'none',
                              MozAppearance: 'textfield',
                              fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                          />
                          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: C.muted }}>€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Immobilier locked */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 }}>
            Immobilier
          </div>
          <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,27,60,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 20, width: 28 }}>🏗️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Immobilier</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Disponible après achat du bien</div>
              </div>
              <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>À venir</div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.red, marginBottom: 16 }}>
            {error}
          </div>
        )}
      </div>

      {/* Sticky save button */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '12px 16px 36px', background: `linear-gradient(to top, ${C.bg} 80%, transparent)` }}>
        <button onClick={handleSave} disabled={total === 0 || loading || saved}
          style={{
            width: '100%',
            background: saved ? C.green : total > 0 ? C.blue : C.muted,
            border: 'none',
            borderRadius: 16,
            padding: '17px',
            fontSize: 16,
            fontWeight: 800,
            color: '#fff',
            cursor: total > 0 ? 'pointer' : 'not-allowed',
            transition: 'all .2s',
            boxShadow: total > 0 ? '0 6px 18px rgba(37,99,235,.35)' : 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
          {saved ? '✓ Enregistré !' : loading ? 'Enregistrement...' : 'Valider la saisie'}
        </button>
      </div>
    </div>
  )
}
