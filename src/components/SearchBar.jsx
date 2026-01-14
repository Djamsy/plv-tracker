import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const navigate = useNavigate()

  const search = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([])
      return
    }

    setSearching(true)
    try {
      // Chercher dans les PLV
      const { data: plvData } = await supabase
        .from('plv')
        .select('id, qr_code, statut, modele:modeles_plv(nom, type)')
        .ilike('qr_code', `%${searchQuery}%`)
        .limit(10)

      // Chercher dans les événements
      const { data: eventData } = await supabase
        .from('paniers')
        .select('id, nom_evenement, numero_evenement, adresse, statut')
        .or(`nom_evenement.ilike.%${searchQuery}%,numero_evenement.ilike.%${searchQuery}%`)
        .limit(5)

      // Chercher dans les modèles
      const { data: modelData } = await supabase
        .from('modeles_plv')
        .select('id, nom, type, categorie')
        .ilike('nom', `%${searchQuery}%`)
        .limit(5)

      const combined = [
        ...(plvData || []).map(item => ({ ...item, type: 'plv' })),
        ...(eventData || []).map(item => ({ ...item, type: 'event' })),
        ...(modelData || []).map(item => ({ ...item, type: 'model' }))
      ]

      setResults(combined)
      setShowResults(true)
    } catch (error) {
      console.error('Erreur recherche:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)
    search(value)
  }

  const handleResultClick = (result) => {
    if (result.type === 'plv') {
      navigate('/qrcodes')
      toast.success(`PLV ${result.qr_code} trouvée !`)
    } else if (result.type === 'event') {
      navigate('/evenements')
      toast.success(`Événement ${result.nom_evenement} trouvé !`)
    } else if (result.type === 'model') {
      navigate('/modeles')
      toast.success(`Modèle ${result.nom} trouvé !`)
    }
    setQuery('')
    setShowResults(false)
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="🔍 Rechercher PLV, événement, modèle..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            paddingRight: '3rem',
            border: '2px solid #e5e7eb',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'all 0.2s'
          }}
        />
        {searching && (
          <div style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)'
          }}>
            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
          </div>
        )}
      </div>

      {/* Résultats */}
      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          left: 0,
          right: 0,
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '0.75rem',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: index < results.length - 1 ? '1px solid #f3f4f6' : 'none',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              {result.type === 'plv' && (
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    📦 {result.qr_code}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {result.modele?.nom || 'Non assigné'} • {result.statut}
                  </div>
                </div>
              )}
              {result.type === 'event' && (
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    📅 {result.nom_evenement}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {result.numero_evenement || result.adresse} • {result.statut}
                  </div>
                </div>
              )}
              {result.type === 'model' && (
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    📋 {result.nom}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {result.type} • {result.categorie || '-'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !searching && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          left: 0,
          right: 0,
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          color: '#9ca3af',
          zIndex: 1000
        }}>
          Aucun résultat trouvé
        </div>
      )}
    </div>
  )
}

export default SearchBar