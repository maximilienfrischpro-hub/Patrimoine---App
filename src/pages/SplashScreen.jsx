import { useNavigate } from 'react-router-dom'

export default function SplashScreen() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B1628',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '0 32px',
    }}>

      <svg width="120" height="120" viewBox="0 0 150 150">
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
        <circle cx="50" cy="103" r="3" fill="#D4A843" opacity="0.6"/>
        <circle cx="75" cy="106" r="4" fill="#D4A843" opacity="0.85"/>
        <circle cx="100" cy="103" r="3" fill="#D4A843" opacity="0.6"/>
      </svg>

      <p style={{
        color: 'rgba(255,255,255,0.5)',
        fontSize: '14px',
        marginTop: '20px',
        marginBottom: '60px',
        letterSpacing: '0.5px',
        textAlign: 'center',
      }}>
        Ton suivi financier personnalisé
      </p>

      <div style={{
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <button
          onClick={() => navigate('/register')}
          style={{
            background: '#2563EB',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            padding: '17px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
          }}
        >
          Créer un compte
        </button>

        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: '14px',
            padding: '17px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Se connecter
        </button>
      </div>
    </div>
  )
}
