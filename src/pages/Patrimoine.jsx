import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Palette ───────────────────────────────────────────────────────────────────
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
  goldBg:  '#FEF3C7',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => n === null || n === undefined
  ? '—'
  : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const fmtDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const fmtDateLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// ── Comptes config ────────────────────────────────────────────────────────────
const COMPTES = [
  { id: 'credit_agricole', label: 'Crédit Agricole', icon: '🏦', group: 'Banque' },
  { id: 'revolut',         label: 'Revolut',          icon: '💳', group: 'Banque' },
  { id: 'fortuneo',        label: 'Fortuneo',          icon: '🏦', group: 'Banque' },
  { id: 'livret_a',        label: 'Livret A',           icon: '💰', group: 'Épargne' },
  { id: 'livret_plus',     label: 'Livret+',            icon: '💰', group: 'Épargne' },
  { id: 'pel',             label: 'PEL',                icon: '🔒', group: 'Épargne', disabled: true },
  { id: 'pea',             label: 'PEA',                icon: '📈', group: 'Investissement' },
  { id: 'trading',         label: 'Trading',            icon: '📊', group: 'Investissement' },
  { id: 'immobilier',      label: 'Immobilier',         icon: '🏗️', group: 'Immobilier', locked: true },
]

const GROUPS = ['Banque', 'Épargne', 'Investissement', 'Immobilier']

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ latest }) {
  if (!latest) return null
  const total = latest.total || 1
  const slices = [
    { label: 'Cash',    color: C.blue,    val: (latest.credit_agricole || 0) + (latest.revolut || 0) + (latest.fortuneo || 0) },
    { label: 'Épargne', color: '#16A34A', val: (latest.livret_a || 0) + (latest.livret_plus || 0) + (latest.pel || 0) },
    { label: 'Bourse',  color: '#F59E0B', val: (latest.pea || 0) + (latest.trading || 0) },
    { label: 'Immo',    color: '#8B5CF6', val: latest.immobilier || 0 },
  ].filter(s => s.val > 0)

  if (slices.length === 0) return (
    <div style={{ textAlign: 'center', padding: '20px', color: C.muted, fontSize: 13 }}>
      Aucune donnée pour l'allocation
    </div>
  )

  const R = 15.9, CX = 18, CY = 18
  const circ = 2 * Math.PI * R
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={90} height={90} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.border} strokeWidth="4"/>
        {slices.map((s, i) => {
          const pct = s.val / total
          const dash = pct * circ
          const gap = circ - dash
          const el = (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none"
              stroke={s.color} strokeWidth="4"
              strokeDasharray={`${dash.toFixed(2)} ${gap.toFixed(2)}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          )
          offset += dash
          return el
        })}
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.textSub, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
              {((s.val / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.navy, borderRadius: 10, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,.25)' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 2 }}>{payload[0]?.payload?.dateLabel}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{fmt(payload[0]?.value)}</div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Patrimoine() {
  const navigate = useNavigate()
  const [saisies, setSaisies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('tout')
  const [activeTab, setActiveTab] = useState('patrimoine')
  const [profile, setProfile] = useState(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: saisiesData }, { data: profileData }] = await Promise.all([
      supabase.from('saisies').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('profiles').select('*').eq('user_id', user.id).single()
    ])

    setSaisies(saisiesData || [])
    setProfile(profileData)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // ── Data processing ──────────────────────────────────────────────────────
  const latest = saisies[saisies.length - 1] || null
  const previous = saisies[saisies.length - 2] || null

  // Variation vs mois précédent
  const getMonthlyVariation = () => {
    if (!latest || saisies.length < 2) return null
    const latestDate = new Date(latest.date)
    const oneMonthAgo = new Date(latestDate)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const monthAgoEntry = [...saisies].reverse().find(s => new Date(s.date) <= oneMonthAgo)
    if (!monthAgoEntry) return null
    return { diff: latest.total - monthAgoEntry.total, label: fmtDate(monthAgoEntry.date) }
  }

  const variation = getMonthlyVariation()

  // Filtered chart data
  const getChartData = () => {
    let data = [...saisies]
    if (filter !== 'tout') {
      const now = new Date()
      const months = filter === '1m' ? 1 : filter === '6m' ? 6 : 12
      const cutoff = new Date(now.setMonth(now.getMonth() - months))
      data = data.filter(s => new Date(s.date) >= cutoff)
    }
    return data.map(s => ({ date: s.date, total: s.total, dateLabel: fmtDate(s.date) }))
  }

  const chartData = getChartData()

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 430, margin: '0 auto', position: 'relative' }}>

      {/* ── PROFILE MODAL ── */}
      {showProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowProfile(false)}>
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: C.surface, borderRadius: '24px 24px 0 0', padding: '24px 20px 48px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 24px' }} />

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px 20px', borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                {profile?.prenom?.[0] || '?'}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{profile?.prenom} {profile?.nom}</div>
                <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>Membre depuis {new Date().getFullYear()}</div>
              </div>
            </div>

            {[
              { icon: '👤', label: 'Mon profil' },
              { icon: '⚙️', label: 'Paramètres' },
              { icon: '🔔', label: 'Notifications' },
              { icon: '📥', label: 'Importer CSV' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: C.text, flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 18, color: C.muted }}>›</span>
              </div>
            ))}

            <div onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px', cursor: 'pointer', marginTop: 8 }}>
              <span style={{ fontSize: 20 }}>🚪</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.red }}>Se déconnecter</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PATRIMOINE TAB ── */}
      {activeTab === 'patrimoine' && (
        <div>
          {/* Header — light background, no navy block */}
          <div style={{ padding: '52px 20px 0', background: C.bg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: C.textSub, marginBottom: 2 }}>
                  Bonjour, {profile?.prenom || 'Max'} 👋
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Mon Patrimoine</div>
              </div>
              <button onClick={() => setShowProfile(true)}
                style={{ width: 38, height: 38, borderRadius: '50%', background: C.blue, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {profile?.prenom?.[0] || 'M'}
              </button>
            </div>

            {/* Total card — soft rounded rectangle bubble, modern gradient */}
            <div style={{ background: 'linear-gradient(135deg, #1A2F5E 0%, #2E4A8C 100%)', borderRadius: 20, padding: '20px 20px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                Patrimoine total
              </div>

              {latest ? (
                <>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 6 }}>
                    {fmt(latest.total)}
                  </div>
                  {variation && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: variation.diff >= 0 ? '#4ADE80' : '#F87171', marginBottom: 4 }}>
                      {variation.diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(variation.diff))} vs {variation.label}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                    Dernière MAJ : {fmtDateLong(latest.date)}
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: -1 }}>— €</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginTop: 4 }}>
                    Aucune saisie — appuie sur ＋ pour commencer
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '0 16px 100px' }}>

            {/* Évolution chart card — filters live here */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '16px 18px', marginBottom: 12, boxShadow: '0 1px 4px rgba(15,27,60,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Évolution</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['1m', '6m', '1a', 'tout'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding: '4px 10px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filter === f ? C.blue : C.bg, color: filter === f ? '#fff' : C.textSub, transition: 'all .15s' }}>
                      {f === 'tout' ? 'Tout' : f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length >= 2 ? (
                <div style={{ height: 90 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.blue} stopOpacity={0.25}/>
                          <stop offset="100%" stopColor={C.blue} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="total" stroke={C.blue} strokeWidth={2.5} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: C.blue }}/>
                      <Tooltip content={<CustomTooltip />} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 12, color: C.muted }}>Le graphique apparaîtra après 2 saisies</div>
                </div>
              )}
            </div>

            {/* Allocation */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '16px 18px', marginBottom: 12, boxShadow: '0 1px 4px rgba(15,27,60,.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Allocation</div>
              {latest ? <DonutChart latest={latest} /> : (
                <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '12px 0' }}>Aucune donnée</div>
              )}
            </div>

            {/* Comptes par groupe */}
            {GROUPS.map(group => {
              const comptes = COMPTES.filter(c => c.group === group)
              return (
                <div key={group}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>
                    {group}
                  </div>
                  <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,27,60,.06)', marginBottom: 12 }}>
                    {comptes.map((c, i) => {
                      const val = latest?.[c.id]
                      const isEmpty = val === null || val === undefined || val === 0
                      const isLast = i === comptes.length - 1
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 20, width: 28, flexShrink: 0 }}>{c.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: c.disabled || c.locked ? C.muted : isEmpty ? C.textSub : C.text }}>
                              {c.label}
                            </div>
                            {c.locked && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>À venir</div>}
                            {c.disabled && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Clôturé</div>}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: c.locked ? C.muted : isEmpty ? C.muted : C.text }}>
                            {c.locked ? '—' : fmt(val || 0)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Historique button */}
            <button onClick={() => navigate('/historique')}
              style={{ width: '100%', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,27,60,.06)' }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Historique des saisies</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{saisies.length} entrée{saisies.length !== 1 ? 's' : ''}</div>
              </div>
              <span style={{ fontSize: 18, color: C.muted }}>›</span>
            </button>
          </div>

          {/* FAB */}
          <button onClick={() => navigate('/saisie')}
            style={{ position: 'fixed', bottom: 84, right: 20, width: 56, height: 56, background: C.blue, border: 'none', borderRadius: '50%', fontSize: 26, color: '#fff', boxShadow: '0 6px 20px rgba(37,99,235,.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            ＋
          </button>
        </div>
      )}

      {/* ── COMING SOON TABS ── */}
      {activeTab !== 'patrimoine' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {activeTab === 'pea' ? '📈' : activeTab === 'immo' ? '🏠' : '🎯'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {activeTab === 'pea' ? 'Module PEA' : activeTab === 'immo' ? 'Module Immobilier' : 'Objectifs'}
          </div>
          <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
            En cours de développement.{'\n'}Bientôt disponible.
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '10px 0 16px', zIndex: 40 }}>
        {[
          { id: 'patrimoine', icon: '📊', label: 'Patrimoine' },
          { id: 'pea',        icon: '📈', label: 'PEA' },
          { id: 'immo',       icon: '🏠', label: 'Immo' },
          { id: 'objectifs',  icon: '🎯', label: 'Objectifs' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 12px' }}>
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: activeTab === tab.id ? C.blue : C.muted }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
