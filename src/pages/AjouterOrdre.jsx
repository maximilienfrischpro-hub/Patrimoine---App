import { useState, useEffect } from 'react'
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

// Types d'ordre, dans l'ordre d'affichage du menu déroulant.
// "interet" volontairement absent : désactivé en V1, jamais rencontré par l'utilisateur.
const TYPES_ORDRE = [
  { id: 'achat',      label: 'Achat' },
  { id: 'vente',      label: 'Vente' },
  { id: 'dividende',  label: 'Dividende' },
  { id: 'apport',     label: 'Apport' },
  { id: 'parrainage', label: 'Parrainage' },
  { id: 'saveback',   label: 'Saveback' },
  { id: 'round_up',   label: 'Round up' },
  { id: 'retrait',    label: 'Retrait' },
]

// Quels champs afficher selon le type — détermine la variante de formulaire
const champsParType = type => {
  if (type === 'achat' || type === 'vente') return ['titre', 'quantite', 'prix', 'frais']
  if (type === 'dividende') return ['titre', 'montant']
  return ['montant'] // apport, parrainage, saveback, round_up, retrait
}

const getYesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

const parseVal = s => {
  if (!s || s === '') return ''
  const n = parseFloat(String(s).replace(',', '.'))
  return isNaN(n) ? '' : n
}

export default function AjouterOrdre() {
  const navigate = useNavigate()

  const [type, setType] = useState('achat')
  const [date, setDate] = useState(getYesterday())
  const [titreQuery, setTitreQuery] = useState('')
  const [titreId, setTitreId] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [quantite, setQuantite] = useState('')
  const [prix, setPrix] = useState('')
  const [frais, setFrais] = useState('')
  const [montant, setMontant] = useState('')

  const [titres, setTitres] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const champs = champsParType(type)

  // Charge la liste des titres existants une seule fois, pour l'autocomplete
  useEffect(() => {
    const chargerTitres = async () => {
      const { data } = await supabase.from('titres').select('id, ticker, nom').order('ticker')
      if (data) setTitres(data)
    }
    chargerTitres()
  }, [])

  // Changement de type : on vide les champs qui ne sont plus pertinents,
  // sans demander de confirmation (formulaire court, coût de re-saisie minime)
  const handleTypeChange = nouveauType => {
    setType(nouveauType)
    setTitreQuery('')
    setTitreId(null)
    setQuantite('')
    setPrix('')
    setFrais('')
    setMontant('')
    setError('')
  }

  const suggestionsFiltrees = titres.filter(t =>
    titreQuery.length > 0 &&
    (t.ticker.toLowerCase().includes(titreQuery.toLowerCase()) ||
     (t.nom && t.nom.toLowerCase().includes(titreQuery.toLowerCase())))
  )

  const selectionnerTitreExistant = t => {
    setTitreId(t.id)
    setTitreQuery(t.nom || t.ticker)
    setShowSuggestions(false)
  }

  const utiliserNouveauTitre = () => {
    setTitreId('NOUVEAU') // marqueur : sera créé à la validation, pas avant
    setShowSuggestions(false)
  }

  const estValide = () => {
    if (champs.includes('titre') && !titreQuery.trim()) return false
    if (champs.includes('quantite') && parseVal(quantite) <= 0) return false
    if (champs.includes('prix') && parseVal(prix) < 0) return false
    if (champs.includes('montant') && parseVal(montant) <= 0) return false
    return true
  }

  const handleValider = async () => {
    if (!estValide()) { setError('Vérifie les champs avant de valider'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non connecté'); setLoading(false); return }

    let finalTitreId = titreId

    // Création à la volée si le titre n'existe pas encore — incomplet par
    // défaut (nom/secteur/pays/devise null), complété plus tard via Paramètres
    if (champs.includes('titre') && titreId === 'NOUVEAU') {
      const { data: nouveauTitre, error: errTitre } = await supabase
        .from('titres')
        .insert({ user_id: user.id, ticker: titreQuery.trim() })
        .select('id')
        .single()

      if (errTitre) {
        setError('Erreur création du titre : ' + errTitre.message)
        setLoading(false)
        return
      }
      finalTitreId = nouveauTitre.id
      // On bascule immédiatement titreId vers le vrai UUID : si l'étape
      // suivante échoue et que l'utilisateur retente, on ne recréera pas
      // le titre une seconde fois (sinon collision sur la contrainte unique)
      setTitreId(nouveauTitre.id)
      setTitres(prev => [...prev, { id: nouveauTitre.id, ticker: titreQuery.trim(), nom: null }])
    }

    const qte = parseVal(quantite)
    const px = parseVal(prix)
    const fr = parseVal(frais) || 0

    const row = {
      user_id: user.id,
      date,
      type,
      titre_id: champs.includes('titre') ? finalTitreId : null,
      quantite: champs.includes('quantite') ? qte : null,
      prix_unitaire_brut: champs.includes('prix') ? px : null,
      frais: champs.includes('frais') ? fr : 0,
      montant: champs.includes('montant')
        ? parseVal(montant)
        : type === 'achat'
          ? (qte * px) + fr   // achat : on paie prix + frais
          : (qte * px) - fr,  // vente : on reçoit prix - frais
    }

    const { error: err } = await supabase.from('carnet_ordres').insert(row)

    if (err) {
      setError('Erreur : ' + err.message)
      setLoading(false)
      return
    }

    setSaved(true)
    setTimeout(() => navigate('/pea'), 1000)
    setLoading(false)
  }

  const renderChampMontantOuPrix = (label, valeur, setValeur, placeholder = '0') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={valeur}
          onChange={e => {
            const v = e.target.value
            if (/^[0-9]*[.,]?[0-9]*$/.test(v)) setValeur(v)
          }}
          style={{
            width: '100%',
            background: C.bg,
            border: `1.5px solid transparent`,
            borderRadius: 10,
            padding: '12px 40px 12px 14px',
            fontSize: 16,
            fontWeight: 700,
            color: C.text,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: C.muted }}>€</span>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 430, margin: '0 auto' }}>

      {/* Header — même style que Saisie Patrimoine */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '52px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/pea')}
          style={{ background: 'none', border: 'none', color: C.blue, fontSize: 22, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          ‹
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Nouvel ordre</div>
      </div>

      <div style={{ padding: '20px 16px 140px' }}>

        {/* Type d'ordre — premier champ, pilote l'affichage du reste */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Type d'ordre
          </label>
          <select
            value={type}
            onChange={e => handleTypeChange(e.target.value)}
            style={{
              width: '100%',
              background: '#EEF3FF',
              border: `1.5px solid ${C.blue}`,
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 14,
              fontWeight: 600,
              color: C.text,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'Inter, system-ui, sans-serif',
              appearance: 'none',
            }}
          >
            {TYPES_ORDRE.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Date — toujours présente, quel que soit le type */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Date
          </label>
          <input type="date" value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 600, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
          />
        </div>

        {/* Titre — autocomplete, uniquement pour achat/vente/dividende */}
        {champs.includes('titre') && (
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              {type === 'dividende' ? 'Titre source' : 'Titre'}
            </label>
            <input
              type="text"
              placeholder="Rechercher un titre..."
              value={titreQuery}
              onFocus={() => setShowSuggestions(true)}
              onChange={e => {
                setTitreQuery(e.target.value)
                setTitreId(null)
                setShowSuggestions(true)
              }}
              style={{
                width: '100%',
                background: '#EEF3FF',
                border: `1.5px solid ${C.blue}`,
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 14,
                color: C.text,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
            {showSuggestions && titreQuery && (
              <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 10, marginTop: 4, boxShadow: '0 4px 12px rgba(15,27,60,.08)', overflow: 'hidden', position: 'absolute', width: '100%', zIndex: 20 }}>
                {suggestionsFiltrees.map(t => (
                  <div key={t.id} onClick={() => selectionnerTitreExistant(t)}
                    style={{ padding: '10px 14px', fontSize: 13, color: C.text, borderBottom: `0.5px solid ${C.border}`, cursor: 'pointer' }}>
                    {t.nom || t.ticker} <span style={{ color: C.muted }}>{t.ticker}</span>
                  </div>
                ))}
                <div onClick={utiliserNouveauTitre}
                  style={{ padding: '10px 14px', fontSize: 13, color: C.textSub, cursor: 'pointer' }}>
                  Utiliser « {titreQuery} » comme nouveau titre
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quantité + Prix unitaire — uniquement achat/vente, côte à côte */}
        {champs.includes('quantite') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Quantité
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={quantite}
                onChange={e => {
                  const v = e.target.value
                  if (/^[0-9]*[.,]?[0-9]*$/.test(v)) setQuantite(v)
                }}
                style={{ width: '100%', background: C.bg, border: '1.5px solid transparent', borderRadius: 10, padding: '12px 14px', fontSize: 16, fontWeight: 700, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>
            {renderChampMontantOuPrix('Prix unitaire brut', prix, setPrix)}
          </div>
        )}

        {/* Frais — uniquement achat/vente */}
        {champs.includes('frais') && renderChampMontantOuPrix('Frais de courtage', frais, setFrais)}

        {/* Montant — dividende, apport et ses sous-types */}
        {champs.includes('montant') && renderChampMontantOuPrix(
          type === 'dividende' ? 'Montant reçu' : 'Montant', montant, setMontant
        )}

        {error && (
          <div style={{ background: '#FEE2E2', border: `1px solid ${C.red}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.red, marginBottom: 16 }}>
            {error}
          </div>
        )}
      </div>

      {/* Bouton sticky — sans montant affiché, cohérent avec "Valider la saisie" */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '12px 16px 36px', background: `linear-gradient(to top, ${C.bg} 80%, transparent)` }}>
        <button onClick={handleValider} disabled={!estValide() || loading || saved}
          style={{
            width: '100%',
            background: saved ? C.green : estValide() ? C.blue : C.muted,
            border: 'none',
            borderRadius: 16,
            padding: '17px',
            fontSize: 16,
            fontWeight: 800,
            color: '#fff',
            cursor: estValide() ? 'pointer' : 'not-allowed',
            boxShadow: estValide() ? '0 6px 18px rgba(37,99,235,.35)' : 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
          {saved ? '✓ Enregistré !' : loading ? 'Enregistrement...' : 'Valider l\'ordre'}
        </button>
      </div>
    </div>
  )
}
