import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'

function QRCodes() {
  const [exemplaires, setExemplaires] = useState([])
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: exemplairesData, error: exemplairesError } = await supabase
        .from('plv')
        .select('*')
        .order('qr_code')
      
      if (exemplairesError) throw exemplairesError

      const { data: modelesData, error: modelesError } = await supabase
        .from('modeles_plv')
        .select('*')
      
      if (modelesError) throw modelesError

      // Joindre les données
      const exemplairesAvecModeles = (exemplairesData || []).map(ex => {
        const modele = modelesData.find(m => m.id === ex.modele_id)
        return { ...ex, modele }
      })

      setExemplaires(exemplairesAvecModeles)
      setModeles(modelesData || [])
    } catch (error) {
      console.error('Erreur:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const imprimerPage = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>QR Codes des PLV</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            {exemplaires.length} exemplaire{exemplaires.length > 1 ? 's' : ''} • {modeles.length} modèle{modeles.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={imprimerPage} className="btn btn-primary">
          🖨️ Imprimer tous les QR codes
        </button>
      </div>

      {/* Grid de QR Codes */}
      {exemplaires.length === 0 ? (
        <div style={{ 
          background: 'white',
          padding: '4rem',
          borderRadius: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Aucun exemplaire
          </h2>
          <p style={{ color: '#6b7280' }}>
            Créez des modèles et des exemplaires pour générer des QR codes
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {exemplaires.map(ex => (
            <div 
              key={ex.id} 
              style={{ 
                background: 'white',
                padding: '1.5rem',
                borderRadius: '1rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                position: 'relative',
                border: '2px solid #e5e7eb',
                transition: 'all 0.3s'
              }}
              className="qr-card"
            >
              {/* Badge statut */}
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: ex.statut === 'disponible' ? '#d1fae5' :
                           ex.statut === 'sorti' ? '#fef3c7' : '#fee2e2',
                color: ex.statut === 'disponible' ? '#065f46' :
                       ex.statut === 'sorti' ? '#92400e' : '#991b1b'
              }}>
                {ex.statut === 'disponible' ? '✅ Dispo' :
                 ex.statut === 'sorti' ? '📦 Sorti' : '🔧 Maintenance'}
              </div>

              {/* QR Code */}
              <div style={{
                padding: '1rem',
                background: 'white',
                borderRadius: '0.5rem',
                border: '3px solid #1f2937'
              }}>
                <QRCodeSVG 
                  value={ex.qr_code} 
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Infos */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 'bold', 
                  color: '#1f2937',
                  marginBottom: '0.5rem'
                }}>
                  {ex.qr_code}
                </h3>
                
                {ex.modele && (
                  <>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      {ex.modele.nom}
                    </p>
                    <div style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      {ex.modele.type}
                    </div>
                  </>
                )}
                
                {!ex.modele && (
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#ef4444',
                    fontStyle: 'italic'
                  }}>
                    ⚠️ Non assigné à un modèle
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default QRCodes