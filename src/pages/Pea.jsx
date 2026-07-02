import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { IconNotebook, IconPlus, IconRefresh } from '@tabler/icons-react'

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

// Tickers du portefeuille PEA — à mettre à jour si nouvelle ligne ajoutée
const TICKERS_PEA = ['EWLD.PA', 'PAEEM.PA', 'LY11.VI', 'ABNX.PA']

// Palette camembert — on prend la couleur N pour la position N
const COULEURS_CAMEMBERT = ['#2563EB', '#16A34A', '#94A3B8', '#DC2626', '#F59E0B', '#8B5CF6']

const fmt = (n, dec = 2) => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec
}).format(n || 0)

const fmtPct = (n) => {
  const v = parseFloat(n || 0)
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

const couleurVariation = (v, surFondSombre = false) => {
  if (surFondSombre) return parseFloat(v) >= 0 ? '#4ADE80' : '#F87171'
  return parseFloat(v) >= 0 ? C.green : C.red
}

export default function Pea() {
  const navigate = useNavigate()
  const [positions, setPositions] = useState([])
  const [cours, setCours] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Calculs dérivés
  const valorisationTotale = positions.reduce((sum, p) => {
    const coursActuel = cours[p.ticker]?.prix ?? 0
    return sum + (p.quantite * coursActuel)
  }, 0)

  const variationJourValeur = positions.reduce((sum, p) => {
    const c = cours[p.ticker]
    if (!c) return sum
    const variationPrix = c.prix - c.prix_veille
    return sum + (p.quantite * variationPrix)
  }, 0)

  const variationJourPct = valorisationTotale > 0
    ? (variationJourValeur / (valorisationTotale - variationJourValeur)) * 100
    : 0

  const chargerDonnees = async (forceRefresh = false) => {
    try {
      // 1. Charger les positions depuis la fonction SQL
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Non connecté'); return }

      const { data: posData, error: posErr } = await supabase
        .rpc('get_positions', { p_user_id: user.id })

      if (posErr) { setError('Erreur positions : ' + posErr.message); return }
      setPositions(posData || [])

      // 2. Appeler l'Edge Function pour les cours (avec cache 24h)
      const { data: coursData, error: coursErr } = await supabase.functions.invoke('get-cours', {
        body: { tickers: TICKERS_PEA, force: forceRefresh }
      })

      if (coursErr) { setError('Erreur cours : ' + coursErr.message); return }
      setCours(coursData?.cours ?? {})
    } catch (err) {
      setError('Erreur : ' + String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { chargerDonnees() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await chargerDonnees(true)
  }

  // Données camembert
  const donneesCamembert = positions
    .map(p => ({
      ticker: p.ticker,
      nom: p.nom || p.ticker,
      valeur: p.quantite * (cours[p.ticker]?.prix ?? 0),
    }))
    .filter(p => p.valeur > 0)
    .sort((a, b) => b.valeur - a.valeur)

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: C.textSub }}>
        Chargement...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 430, margin: '0 auto', paddingBottom: 160 }}>

      {/* Header */}
      <div style={{ padding: '52px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, color: C.textSub }}>Bonjour, Max 👋</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Mon PEA</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}>
            <IconRefresh size={20} stroke={1.75} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>M</div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 0' }}>

        {error && (
          <div style={{ background: '#FEE2E2', border: `1px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.red, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Hero — Valorisation totale */}
        <div style={{ background: 'linear-gradient(135deg, #1A2F5E 0%, #2E4A8C 100%)', borderRadius: 20, padding: '20px 20px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            Valorisation totale
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: 'white', marginBottom: 6 }}>
            {fmt(valorisationTotale)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: couleurVariation(variationJourPct, true) }}>
            {fmtPct(variationJourPct)} aujourd'hui
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            {today}
          </div>
        </div>

        {/* Performance vs Indices — placeholder V1.5 */}
        <div style={{ background: C.surface, borderRadius: 16, boxShadow: '0 1px 4px rgba(15,27,60,.06)', padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Performance vs Indices</div>
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, color: C.muted }}>Bientôt disponible</div>
          </div>
        </div>

        {/* Widgets Performance du mois + de l'année */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div style={{ background: 'linear-gradient(135deg, #1A2F5E 0%, #2E4A8C 100%)', borderRadius: 16, padding: '14px 16px', position: 'relative', minHeight: 88 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
              Perf. du mois
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>—</div>
            <div style={{ position: 'absolute', bottom: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 14 }}>›</span>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #1A2F5E 0%, #2E4A8C 100%)', borderRadius: 16, padding: '14px 16px', position: 'relative', minHeight: 88 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
              Perf. de l'année
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>—</div>
            <div style={{ position: 'absolute', bottom: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 14 }}>›</span>
            </div>
          </div>
        </div>

        {/* Évolution — placeholder V1.5 */}
        <div style={{ background: C.surface, borderRadius: 16, boxShadow: '0 1px 4px rgba(15,27,60,.06)', padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Évolution</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['1M','6M','1A','Tout'].map((f, i) => (
                <span key={f} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 14, background: i === 0 ? C.blue : C.bg, color: i === 0 ? 'white' : C.textSub, fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: C.muted }}>Bientôt disponible</div>
          </div>
        </div>

        {/* Label Portefeuille */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, padding: '8px 4px', marginBottom: 8 }}>
          Portefeuille
        </div>

        {/* Camembert */}
        {donneesCamembert.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 16, boxShadow: '0 1px 4px rgba(15,27,60,.06)', padding: '16px 18px', marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 84, height: 84, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donneesCamembert} dataKey="valeur" cx="50%" cy="50%" innerRadius={24} outerRadius={40} strokeWidth={2}>
                    {donneesCamembert.map((_, i) => (
                      <Cell key={i} fill={COULEURS_CAMEMBERT[i % COULEURS_CAMEMBERT.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {donneesCamembert.map((p, i) => {
                const pct = valorisationTotale > 0 ? (p.valeur / valorisationTotale * 100).toFixed(1) : 0
                return (
                  <div key={p.ticker} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSub }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COULEURS_CAMEMBERT[i % COULEURS_CAMEMBERT.length], display: 'inline-block', flexShrink: 0 }}></span>
                    {p.nom} {pct}%
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Liste des positions */}
        <div style={{ background: C.surface, borderRadius: 16, boxShadow: '0 1px 4px rgba(15,27,60,.06)', overflow: 'hidden' }}>
          {positions.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
              Aucune position — ajoutez vos premiers ordres
            </div>
          ) : (
            positions.map((p, i) => {
              const coursActuel = cours[p.ticker]?.prix ?? 0
              const valeur = p.quantite * coursActuel
              const variationVsPru = p.pru > 0 ? ((coursActuel - p.pru) / p.pru) * 100 : 0
              const isLast = i === positions.length - 1

              return (
                <div key={p.titre_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.nom || p.ticker}</div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                      {p.quantite} parts · PRU {fmt(p.pru)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{fmt(valeur)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: couleurVariation(variationVsPru) }}>
                      {fmtPct(variationVsPru)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Barre fixe en bas */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, zIndex: 40 }}>

        {/* Boutons Carnet d'ordres + Ajouter */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 10, background: `linear-gradient(to top, ${C.bg} 80%, transparent)` }}>
          <button onClick={() => navigate('/pea/carnet-ordres')}
            style={{ flex: 1, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: C.text, cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,27,60,.08)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <IconNotebook size={18} stroke={1.75} />
            Carnet d'ordres
          </button>
          <button onClick={() => navigate('/pea/ajouter')} aria-label="Ajouter un ordre"
            style={{ width: 52, height: 52, borderRadius: 14, background: C.navy, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', boxShadow: '0 6px 20px rgba(15,27,60,.4)' }}>
            <IconPlus size={22} color="#fff" stroke={2} />
          </button>
        </div>

        {/* Nav basse — même style que Patrimoine */}
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '10px 0 16px' }}>
          {[
            { id: 'patrimoine', icon: '📊', label: 'Patrimoine', action: () => navigate('/patrimoine') },
            { id: 'pea',        icon: '📈', label: 'PEA',        action: () => {} },
            { id: 'immo',       icon: '🏠', label: 'Immo',       action: () => {} },
            { id: 'objectifs',  icon: '🎯', label: 'Objectifs',  action: () => {} },
          ].map(tab => (
            <button key={tab.id} onClick={tab.action}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 12px' }}>
              <span style={{ fontSize: 22 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: tab.id === 'pea' ? C.blue : C.muted }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
