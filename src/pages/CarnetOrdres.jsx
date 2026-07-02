import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  IconShoppingCart, IconArrowDownCircle, IconArrowUpCircle, IconCoin,
  IconRecycle, IconGift, IconChevronDown, IconChevronUp,
} from '@tabler/icons-react'

const C = {
  bg:      '#F4F6FB',
  blue:    '#2563EB',
  green:   '#16A34A',
  red:     '#DC2626',
  surface: '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  textSub: '#64748B',
  muted:   '#94A3B8',
}

// Icône + couleur de fond par type — palette resserrée sur la charte existante
// (pas de couleurs catégorielles arbitraires, cf. discussion de design)
const STYLE_PAR_TYPE = {
  achat:      { Icon: IconShoppingCart,    bg: '#EEF3FF', fg: C.blue },
  vente:      { Icon: IconArrowUpCircle,   bg: '#FDEDED', fg: C.red },
  dividende:  { Icon: IconCoin,            bg: '#E8F8EE', fg: C.green },
  apport:     { Icon: IconArrowDownCircle, bg: '#E8F8EE', fg: C.green },
  parrainage: { Icon: IconGift,            bg: '#E8F8EE', fg: C.green },
  saveback:   { Icon: IconGift,            bg: '#E8F8EE', fg: C.green },
  round_up:   { Icon: IconRecycle,         bg: '#F1F5F9', fg: C.textSub },
  retrait:    { Icon: IconArrowDownCircle, bg: '#FDEDED', fg: C.red },
}

const LABEL_PAR_TYPE = {
  achat: 'Achat', vente: 'Vente', dividende: 'Dividende', apport: 'Apport',
  parrainage: 'Parrainage', saveback: 'Saveback', round_up: 'Round up', retrait: 'Retrait',
}

// Types pour lesquels la ligne ouvre un détail au clic (chevron visible)
const TYPES_AVEC_DETAIL = ['achat', 'vente']

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0)

const fmtDateCourte = dateStr => {
  const d = new Date(dateStr)
  return `${d.getDate()} ${MOIS_FR[d.getMonth()].slice(0, 3)}`
}

const cleParMois = dateStr => {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const libelleMois = cle => {
  const [annee, mois] = cle.split('-')
  return `${MOIS_FR[parseInt(mois, 10) - 1]} ${annee}`
}

export default function CarnetOrdres() {
  const navigate = useNavigate()
  const [ordres, setOrdres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ordreOuvert, setOrdreOuvert] = useState(null)

  useEffect(() => {
    const chargerOrdres = async () => {
      const { data, error: err } = await supabase
        .from('carnet_ordres')
        .select('id, date, type, quantite, prix_unitaire_brut, frais, montant, titres(id, ticker, nom)')
        .order('date', { ascending: false })

      if (err) {
        setError('Erreur de chargement : ' + err.message)
      } else {
        setOrdres(data || [])
      }
      setLoading(false)
    }
    chargerOrdres()
  }, [])

  // Regroupement par mois, en conservant l'ordre chronologique inversé
  // déjà garanti par le tri SQL (pas de re-tri ici, juste un groupBy)
  const groupes = ordres.reduce((acc, ordre) => {
    const cle = cleParMois(ordre.date)
    if (!acc[cle]) acc[cle] = []
    acc[cle].push(ordre)
    return acc
  }, {})
  const clesMoisOrdonnees = Object.keys(groupes).sort().reverse()

  const nomAffiche = ordre => ordre.titres ? (ordre.titres.nom || ordre.titres.ticker) : null

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: C.textSub }}>
        Chargement...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 430, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '52px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/pea')}
          style={{ background: 'none', border: 'none', color: C.blue, fontSize: 22, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Carnet d'ordres</div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {error && (
          <div style={{ background: '#FEE2E2', border: `1px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.red, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!error && ordres.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: 14 }}>
            Aucun ordre enregistré pour l'instant
          </div>
        )}

        {clesMoisOrdonnees.map(cle => (
          <div key={cle} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>
              {libelleMois(cle)}
            </div>
            <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,27,60,.06)' }}>
              {groupes[cle].map((ordre, i, arr) => {
                const style = STYLE_PAR_TYPE[ordre.type] || STYLE_PAR_TYPE.round_up
                const avecDetail = TYPES_AVEC_DETAIL.includes(ordre.type)
                const isLast = i === arr.length - 1
                const titre = nomAffiche(ordre)
                const sousLabel = titre ? `${LABEL_PAR_TYPE[ordre.type]} · ${titre}` : LABEL_PAR_TYPE[ordre.type]

                return (
                  <div key={ordre.id}>
                    <div
                      onClick={() => avecDetail && setOrdreOuvert(ordreOuvert === ordre.id ? null : ordre.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                        borderBottom: isLast && ordreOuvert !== ordre.id ? 'none' : `1px solid ${C.border}`,
                        cursor: avecDetail ? 'pointer' : 'default',
                      }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <style.Icon size={18} color={style.fg} stroke={1.75} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{sousLabel}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{fmtDateCourte(ordre.date)}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{fmt(ordre.montant)}</div>
                      {avecDetail && (
                        ordreOuvert === ordre.id
                          ? <IconChevronUp size={16} color={C.muted} style={{ marginLeft: 2, flexShrink: 0 }} />
                          : <IconChevronDown size={16} color={C.muted} style={{ marginLeft: 2, flexShrink: 0 }} />
                      )}
                    </div>

                    {/* Détail en lecture seule, uniquement achat/vente */}
                    {avecDetail && ordreOuvert === ordre.id && (
                      <div style={{ padding: '4px 16px 16px', borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
                        <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
                          <LigneDetail label="Nombre de parts" valeur={ordre.quantite} />
                          <LigneDetail label="Prix unitaire brut" valeur={fmt(ordre.prix_unitaire_brut)} />
                          <LigneDetail label="Frais de courtage" valeur={fmt(ordre.frais)} />
                          <LigneDetail label="Coût total" valeur={fmt(ordre.montant)} dernier />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LigneDetail({ label, valeur, dernier }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: dernier ? `1px solid ${C.border}` : 'none' }}>
      <span style={{ fontSize: 12, color: C.textSub }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: dernier ? 800 : 700, color: C.text }}>{valeur}</span>
    </div>
  )
}
