import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg:      '#F4F6FB',
  navy:    '#0F1B3C',
  blue:    '#2563EB',
  blueSoft:'#EEF3FF',
  green:   '#16A34A',
  red:     '#DC2626',
  redSoft: '#FEE2E2',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  textSub: '#64748B',
  muted:   '#94A3B8',
}

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDateLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const COMPTES = [
  { id: 'credit_agricole', label: 'Crédit Agricole', icon: '🏦' },
  { id: 'revolut',         label: 'Revolut',          icon: '💳' },
  { id: 'fortuneo',        label: 'Fortuneo',          icon: '🏦' },
  { id: 'livret_a',        label: 'Livret A',           icon: '💰' },
  { id: 'livret_plus',     label: 'Livret+',            icon: '💰' },
  { id: 'pel',             label: 'PEL',                icon: '🔒' },
  { id: 'pea',             label: 'PEA',                icon: '📈' },
  { id: 'trading',         label: 'Trading',            icon: '📊' },
]

export default function Historique() {
  const navigate = useNavigate()
  const [saisies, setSaisies] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailEntry, setDetailEntry] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [swipedId, setSwipedId] = useState(null)
  const [touchStart, setTouchStart] = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('saisies')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    setSaisies(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('saisies').delete().eq('id', id)
    setSaisies(prev => prev.filter(s => s.id !== id))
    setDeleteConfirm(null)
    setDetailEntry(null)
    setSwipedId(null)
  }

  const getVariation = (entry) => {
    const sorted = [...saisies].sort((a, b) => a.date.localeCompare(b.date))
    const idx = sorted.findIndex(s => s.id === entry.id)
    if (idx <= 0) return null
    return entry.total - sorted[idx - 1].total
  }

  // Touch handlers for swipe
  const handleTouchStart = (e, id) => setTouchStart({ x: e.touches[0].clientX, id })
  const handleTouchEnd = (e) => {
    if (!touchStart) return
    const diff = touchStart.x - e.changedTouches[0].clientX
    if (diff > 60) setSwipedId(touchStart.id)
    else if (diff < -20) setSwipedId(null)
    setTouchStart(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 430, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: C.navy, padding: '52px 20px 24px' }}>
        <button onClick={() => navigate('/patrimoine')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 15, cursor: 'pointer', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          ‹ Patrimoine
        </button>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          Historique
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
          {saisies.length} saisie{saisies.length !== 1 ? 's' : ''}
        </div>
        {saisies.length > 0 && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
            Swipe une ligne vers la gauche pour supprimer
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ padding: '16px 16px 40px' }}>
        {saisies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14 }}>Aucune saisie pour le moment</div>
          </div>
        ) : (
          saisies.map(entry => {
            const variation = getVariation(entry)
            const isSwiped = swipedId === entry.id
            return (
              <div key={entry.id} style={{ position: 'relative', marginBottom: 10, overflow: 'hidden', borderRadius: 14 }}>
                {/* Delete background */}
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0, width: 80,
                  background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }} onClick={() => setDeleteConfirm(entry.id)}>
                  <span style={{ fontSize: 22 }}>🗑️</span>
                </div>

                {/* Card */}
                <div
                  onTouchStart={e => handleTouchStart(e, entry.id)}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => !isSwiped && setDetailEntry(entry)}
                  style={{
                    background: C.surface,
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(15,27,60,.06)',
                    transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)',
                    transition: 'transform .2s',
                    position: 'relative',
                  }}>
                  <div style={{ background: C.blueSoft, borderRadius: 12, padding: '7px 10px', textAlign: 'center', minWidth: 46, flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: C.blue, lineHeight: 1 }}>
                      {new Date(entry.date + 'T12:00:00').getDate()}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.blue, textTransform: 'uppercase', marginTop: 2 }}>
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{fmt(entry.total)}</div>
                    {variation !== null ? (
                      <div style={{ fontSize: 12, fontWeight: 600, color: variation >= 0 ? C.green : C.red, marginTop: 2 }}>
                        {variation >= 0 ? '▲' : '▼'} {fmt(Math.abs(variation))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Première saisie</div>
                    )}
                  </div>
                  <span style={{ fontSize: 18, color: C.muted }}>›</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, textAlign: 'center' }}>
              Supprimer cette saisie ?
            </div>
            <div style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginBottom: 20 }}>
              Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, color: C.textSub, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                style={{ flex: 1, background: C.red, border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setDetailEntry(null)}>
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', padding: '20px 0 36px', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 20px' }} />

            <div style={{ padding: '0 20px 16px' }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{fmtDateLong(detailEntry.date)}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.text }}>{fmt(detailEntry.total)}</div>
            </div>

            <div style={{ padding: '0 20px' }}>
              <div style={{ background: C.bg, borderRadius: 14, overflow: 'hidden' }}>
                {COMPTES.map((c, i) => {
                  const val = detailEntry[c.id]
                  const isEmpty = !val || val === 0
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < COMPTES.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ fontSize: 18, width: 24 }}>{c.icon}</div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isEmpty ? C.muted : C.text }}>{c.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isEmpty ? C.muted : C.text }}>{fmt(val || 0)}</div>
                    </div>
                  )
                })}
              </div>

              <button onClick={() => setDeleteConfirm(detailEntry.id)}
                style={{ width: '100%', marginTop: 16, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: C.red, cursor: 'pointer' }}>
                🗑️ Supprimer cette saisie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
